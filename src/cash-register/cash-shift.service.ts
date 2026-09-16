import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CashShift, ShiftStatus } from './entities/cash-shift.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import {
  Order,
  OrderStatus,
  PaymentMethod,
} from '../sales/entities/order.entity';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';

@Injectable()
export class CashShiftService {
  constructor(
    @InjectRepository(CashShift)
    private readonly cashShiftRepository: Repository<CashShift>,
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepository: Repository<CashTransaction>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Busca el turno activo ('OPEN') de una sucursal específica o global.
   */
  async findActive(branchId?: string | number): Promise<CashShift | null> {
    const whereClause: any = { status: ShiftStatus.OPEN };

    if (branchId !== undefined && branchId !== null && branchId !== '') {
      whereClause.branchId = branchId;
    }

    const activeShift = await this.cashShiftRepository.findOne({
      where: whereClause,
      order: { openedAt: 'DESC' },
    });

    return activeShift || null;
  }

  async openShift(dto: OpenShiftDto): Promise<CashShift> {
    const activeShift = await this.findActive(dto.branchId);

    if (activeShift) {
      throw new BadRequestException(
        'Ya existe un turno de caja abierto para esta sucursal.',
      );
    }

    const newShift = this.cashShiftRepository.create({
      branchId: dto.branchId as any,
      openedById: dto.openedById as any,
      openedBy: dto.openedById ? ({ id: dto.openedById } as any) : undefined,
      initialCash: Number(dto.initialCash),
      status: ShiftStatus.OPEN,
      openedAt: new Date(),
    });

    return await this.cashShiftRepository.save(newShift);
  }

  async closeShift(params: {
    shiftId: string;
    closedById: string;
    finalCashReal: number;
  }): Promise<CashShift> {
    const shift = await this.cashShiftRepository.findOne({
      where: { id: params.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('El turno de caja especificado no existe.');
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException(
        'El turno de caja ya se encuentra cerrado.',
      );
    }

    const rawRealCash =
      params.finalCashReal ??
      (params as any).final_cash_real ??
      (params as any).realCash;

    const parsedRealCash = Number(rawRealCash);

    if (isNaN(parsedRealCash)) {
      throw new BadRequestException('El monto real contado no es válido.');
    }

    const summary = await this.getShiftSummary(params.shiftId);

    shift.closedById = params.closedById as any;
    if (params.closedById) {
      shift.closedBy = { id: params.closedById } as any;
    }

    shift.finalCashCalculated = summary.expectedCash;
    shift.finalCashReal = parsedRealCash;
    shift.difference = parsedRealCash - summary.expectedCash;
    shift.status = ShiftStatus.CLOSED;
    shift.closedAt = new Date();

    return await this.cashShiftRepository.save(shift);
  }

  async getShiftSummary(shiftId: string) {
    const shift = await this.cashShiftRepository.findOne({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('El turno de caja especificado no existe.');
    }

    // 1. Obtener transacciones asociadas a la caja chicas
    const transactions = await this.cashTransactionRepository.find({
      where: [
        { cashShiftId: shiftId as any },
        { cashShift: { id: shiftId } as any },
      ],
    });

    // Tolera nulos o minúsculas / mayúsculas, asumiendo EXPENSE por defecto si se omitió el tipo al registrar
    const totalExpenses = transactions
      .filter((t: any) => {
        const typeStr = String(
          t.transactionType || t.type || 'EXPENSE',
        ).toUpperCase();
        return typeStr === 'EXPENSE' || typeStr === 'EGRESO';
      })
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const totalManualIncomes = transactions
      .filter((t: any) => {
        const typeStr = String(t.transactionType || t.type || '').toUpperCase();
        return typeStr === 'INCOME' || typeStr === 'INGRESO';
      })
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // 2. Sumar total de ventas completadas pagadas en EFECTIVO asociadas a este turno
    const cashSalesResult = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.cash_shift_id = :shiftId', { shiftId })
      .andWhere('order.payment_method = :paymentMethod', {
        paymentMethod: PaymentMethod.CASH,
      })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .select('SUM(order.total)', 'sum')
      .getRawOne();

    const totalCashSales = Number(cashSalesResult?.sum || 0);

    // 3. Cálculo de caja esperada (Fondo Inicial + Ventas Efectivo + Ingresos Manuales - Egresos)
    const expectedCash =
      Number(shift.initialCash) +
      totalCashSales +
      totalManualIncomes -
      totalExpenses;

    return {
      initialCash: Number(shift.initialCash),
      totalExpenses,
      totalIncomes: totalManualIncomes + totalCashSales,
      totalCashSales,
      expectedCash,
    };
  }

  async createTransaction(
    dto: CreateCashTransactionDto,
  ): Promise<CashTransaction> {
    let shiftId = (dto as any).cashShiftId || (dto as any).shiftId;
    let shift: CashShift | null = null;

    if (shiftId) {
      shift = await this.cashShiftRepository.findOne({
        where: { id: shiftId },
      });
    } else {
      shift = await this.findActive((dto as any).branchId);
    }

    if (!shift || shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException(
        'No hay un turno de caja activo en el servidor para asociar la transacción.',
      );
    }

    const userId =
      (dto as any).registeredById ||
      (dto as any).registeredBy ||
      (dto as any).userId;

    if (!userId) {
      throw new BadRequestException(
        'Se requiere el ID del usuario autenticado para registrar la transacción.',
      );
    }

    const resolvedType = (
      (dto as any).transactionType ||
      (dto as any).type ||
      'EXPENSE'
    ).toUpperCase();

    const resolvedReason =
      (dto as any).reason || (dto as any).concept || (dto as any).description;

    const transaction = this.cashTransactionRepository.create({
      cashShiftId: shift.id,
      cashShift: { id: shift.id },
      registeredById: userId,
      registeredBy: { id: userId },
      amount: Number(dto.amount),
      reason: resolvedReason,
      transactionType: resolvedType,
      type: resolvedType,
    } as unknown as DeepPartial<CashTransaction>);

    return await this.cashTransactionRepository.save(transaction);
  }
}
