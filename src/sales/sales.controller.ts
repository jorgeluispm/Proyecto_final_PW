import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VoidOrderDto } from './dto/void-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta la ruta según tu estructura de carpetas

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * GET /sales/orders?shiftId=xxx
   * Obtiene el historial de órdenes, opcionalmente filtrado por turno.
   */
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(@Query('shiftId') shiftId?: string) {
    const orders = await this.salesService.getOrders(shiftId);
    return {
      message: 'Historial de órdenes obtenido con éxito.',
      data: orders,
    };
  }

  /**
   * POST /sales/process
   * Registra y procesa una nueva venta (o guarda borrador/cuenta abierta).
   * Requiere autenticación JWT para validar el usuario que ejecuta la venta.
   */
  @Post('process')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async processSale(@Body() dto: CreateOrderDto, @Request() req) {
    // Inyecta o valida el ID del usuario directamente del token de sesión
    dto.userId = req.user.id;

    const order = await this.salesService.processSale(dto);
    return {
      message: dto.isDraft
        ? 'Orden guardada como borrador correctamente.'
        : 'Venta procesada con éxito.',
      data: order,
    };
  }

  /**
   * POST /sales/orders/:id/void
   * Anula una orden y reintegra los productos al inventario.
   * Requiere autenticación JWT para extraer el ID del usuario.
   */
  @Post('orders/:id/void')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async voidOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: VoidOrderDto,
    @Request() req,
  ) {
    const voidedOrder = await this.salesService.voidOrder(
      orderId,
      dto,
      req.user.id,
    );
    return {
      message: 'Orden anulada con éxito y productos retornados al inventario.',
      data: voidedOrder,
    };
  }
}
