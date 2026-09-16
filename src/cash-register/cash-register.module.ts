import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashShift } from './entities/cash-shift.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import { Order } from '../sales/entities/order.entity';
import { CashShiftService } from './cash-shift.service';
import { CashShiftController } from './cash-shift.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CashShift, CashTransaction, Order])],
  controllers: [CashShiftController],
  providers: [CashShiftService],
  exports: [CashShiftService],
})
export class CashRegisterModule {}
