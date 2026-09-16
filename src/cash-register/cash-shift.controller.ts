import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CashShiftService } from './cash-shift.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cash-shifts')
@UseGuards(JwtAuthGuard)
export class CashShiftController {
  constructor(private readonly cashShiftService: CashShiftService) {}

  /**
   * GET /cash-shifts/active?branchId=...
   * Obtiene el turno activo para una sucursal específica.
   */
  @Get('active')
  async getActiveShift(
    @Query('branchId') branchId?: string,
    @Query('branch_id') branchIdSnake?: string,
  ) {
    const id = branchId || branchIdSnake;
    const shift = await this.cashShiftService.findActive(id);
    return {
      data: shift,
    };
  }

  /**
   * POST /cash-shifts/open
   * Abre un nuevo turno de caja para la sucursal indicada.
   */
  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  async openShift(@Body() dto: OpenShiftDto, @Req() req: any) {
    const openedById = dto.openedById || req.user?.id;
    const shift = await this.cashShiftService.openShift({
      ...dto,
      openedById,
    });

    return {
      message: 'Turno de caja abierto correctamente.',
      data: shift,
    };
  }

  /**
   * POST /cash-shifts/:id/close
   * Ejecuta el arqueo y cierre del turno de caja.
   */
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async closeShift(
    @Param('id', ParseUUIDPipe) shiftId: string,
    @Body() dto: CloseShiftDto,
    @Req() req: any,
  ) {
    const closedById = dto.closedById || req.user?.id;

    // Captura finalCashReal garantizando tolerancia si el frontend envía snake_case o realCash
    const rawRealCash =
      dto.finalCashReal ??
      (dto as any).final_cash_real ??
      (dto as any).realCash;

    const closedShift = await this.cashShiftService.closeShift({
      shiftId,
      closedById,
      finalCashReal: rawRealCash,
    });

    return {
      message: 'Turno de caja cerrado exitosamente.',
      data: closedShift,
    };
  }

  /**
   * GET /cash-shifts/:id/summary
   * Obtiene el reporte en tiempo real antes de cerrar turno.
   */
  @Get(':id/summary')
  async getShiftSummary(@Param('id', ParseUUIDPipe) shiftId: string) {
    const summary = await this.cashShiftService.getShiftSummary(shiftId);
    return {
      data: summary,
    };
  }

  /**
   * POST /cash-shifts/transaction
   * Registra una salida de caja / egreso chica en el turno activo.
   */
  @Post('transaction')
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(
    @Body() dto: CreateCashTransactionDto,
    @Req() req: any,
  ) {
    const userId = (dto as any).registeredById || req.user?.id;

    const transaction = await this.cashShiftService.createTransaction({
      ...dto,
      registeredById: userId,
    } as any);

    return {
      message: 'Salida de caja registrada con éxito.',
      data: transaction,
    };
  }
}
