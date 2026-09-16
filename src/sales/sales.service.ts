import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PaymentDetail } from './entities/payment-detail.entity';
import {
  CashShift,
  ShiftStatus,
} from '../cash-register/entities/cash-shift.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import {
  CreateOrderDto,
  CreateOrderItemDto,
  PaymentItemDto,
} from './dto/create-order.dto';
import { VoidOrderDto } from './dto/void-order.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}
  /**
   * Obtiene el historial de órdenes, opcionalmente filtrado por el turno de caja (shiftId).
   */
  async getOrders(shiftId?: string): Promise<Order[]> {
    const query = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.productVariant', 'productVariant')
      .orderBy('order.createdAt', 'DESC');

    if (shiftId) {
      query.andWhere('order.cashShiftId = :shiftId', { shiftId });
    }

    return await query.getMany();
  }
  /**
   * Procesa la creación de una venta con soporte para Pagos Divididos (SPLIT)
   * y descuenta el stock de forma atómica.
   */
  async processSale(dto: CreateOrderDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Verificar turno de caja abierto en la sucursal del usuario
      const activeShift = await manager.findOne(CashShift, {
        where: { branchId: dto.branchId, status: ShiftStatus.OPEN },
      });

      if (!activeShift) {
        throw new BadRequestException(
          'No existe un turno de caja abierto en esta sucursal.',
        );
      }

      // 2. Procesar ítems y actualizar stock atómicamente
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const itemDto of dto.items) {
        const itemSubtotal = itemDto.unitPrice * itemDto.quantity;
        totalAmount += itemSubtotal;

        // Descontar inventario de la variante con QueryRunner seguro contra condiciones de carrera
        const updateRes = await manager.query(
          `UPDATE product_variants 
               SET stock_quantity = stock_quantity - $1 
               WHERE id = $2 AND stock_quantity >= $1 
               RETURNING id`,
          [itemDto.quantity, itemDto.productVariantId],
        );

        if (updateRes.length === 0) {
          const variant = await manager.findOne(ProductVariant, {
            where: { id: itemDto.productVariantId },
          });
          throw new BadRequestException(
            `Stock insuficiente para el producto/variante: ID ${itemDto.productVariantId} (${variant?.variantName || 'Variante'})`,
          );
        }

        const orderItem = manager.create(OrderItem, {
          productVariantId: itemDto.productVariantId,
          unitPrice: itemDto.unitPrice,
          quantity: itemDto.quantity,
          subtotal: itemSubtotal,
        });
        orderItems.push(orderItem);
      }

      // 3. Procesar desglose de pagos (SPLIT o Pago Único)
      const isCompleted = !dto.isDraft;
      let orderPaymentMethod = dto.paymentMethod || PaymentMethod.CASH;
      const paymentEntities: PaymentDetail[] = [];
      let totalPaid = 0;

      if (isCompleted) {
        let paymentsToProcess: PaymentItemDto[] = dto.payments || [];

        // Si no enviaron el arreglo 'payments', armamos uno por defecto con paymentMethod/amountPaid
        if (paymentsToProcess.length === 0) {
          paymentsToProcess = [
            {
              paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
              amount: dto.amountPaid || totalAmount,
            },
          ];
        }

        // Definir si el método global de la orden es SPLIT o un pago único
        if (paymentsToProcess.length > 1) {
          orderPaymentMethod = PaymentMethod.SPLIT;
        } else if (paymentsToProcess.length === 1) {
          orderPaymentMethod = paymentsToProcess[0].paymentMethod;
        }

        // Construir los registros de pago y validar montos
        for (const p of paymentsToProcess) {
          totalPaid += Number(p.amount);

          const paymentDetail = manager.create(PaymentDetail, {
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            referenceNumber: p.referenceNumber || null,
          });
          paymentEntities.push(paymentDetail);
        }

        if (totalPaid < totalAmount) {
          throw new BadRequestException(
            `El monto pagado ($${totalPaid.toFixed(2)}) es menor al total de la orden ($${totalAmount.toFixed(2)}).`,
          );
        }
      }

      const changeDue = totalPaid > totalAmount ? totalPaid - totalAmount : 0;
      // 4. Generar Consecutivo de Factura Global Único (ej: FAC-TOC-00001, FAC-TOC-00002)
      const shiftBranchCode = 'TOC';

      const lastInvoiceQuery = await manager.query(
        `SELECT invoice_number 
    FROM orders 
    WHERE invoice_number LIKE $1 
    ORDER BY created_at DESC 
    LIMIT 1`,
        [`FAC-${shiftBranchCode}-%`],
      );

      let nextNum = 1;

      if (lastInvoiceQuery.length > 0 && lastInvoiceQuery[0].invoice_number) {
        const parts = lastInvoiceQuery[0].invoice_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextNum = lastSeq + 1;
        }
      }

      const invoiceNumber = `FAC-${shiftBranchCode}-${String(nextNum).padStart(5, '0')}`;
      // 5. Registrar la Orden con sus ítems y desglose de pagos
      const order = manager.create(Order, {
        cashShiftId: activeShift.id,
        createdById: dto.userId,
        invoiceNumber: isCompleted ? invoiceNumber : null,
        customerName: dto.customerName || 'Cliente General',
        status: isCompleted ? OrderStatus.COMPLETED : OrderStatus.OPEN,
        paymentMethod: orderPaymentMethod,
        subtotal: totalAmount,
        total: totalAmount,
        amountPaid: isCompleted ? totalPaid : 0,
        changeDue: isCompleted ? changeDue : 0,
        completedAt: isCompleted ? new Date() : null,
        items: orderItems,
        payments: paymentEntities,
      });

      return await manager.save(Order, order);
    });
  }

  /**
   * Anula una orden y restituye automáticamente el stock a cada variante.
   */
  async voidOrder(
    orderId: string,
    dto: VoidOrderDto,
    userId: string,
  ): Promise<Order> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Buscar la orden con sus ítems
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { items: true },
      });

      if (!order) {
        throw new NotFoundException('No se encontró la orden solicitada.');
      }

      if (order.status === OrderStatus.VOIDED) {
        throw new BadRequestException('Esta orden ya se encuentra anulada.');
      }

      // 2. Restituir el stock de cada variante
      for (const item of order.items) {
        await manager.query(
          `UPDATE product_variants 
             SET stock_quantity = stock_quantity + $1 
             WHERE id = $2`,
          [item.quantity, item.productVariantId],
        );
      }

      // 3. Marcar la orden como anulada
      order.status = OrderStatus.VOIDED;
      order.voidReason = dto.reason;
      order.voidedById = userId;
      order.voidedAt = new Date();

      const updatedOrder = await manager.save(Order, order);

      // 4. Registrar evento de auditoría
      await this.auditService.logAction({
        userId: userId,
        cashShiftId: order.cashShiftId,
        action: 'VOID_ORDER',
        entity: 'ORDERS',
        details: {
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          totalAmount: order.total,
          reason: dto.reason,
        },
      });

      return updatedOrder;
    });
  }
}
