import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CashShift } from './cash-shift.entity';
import { User } from '../../users/entities/user.entity';

@Entity('cash_transactions')
export class CashTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cash_shift_id', type: 'uuid' })
  cashShiftId: string;

  @ManyToOne(() => CashShift, (shift) => shift.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cash_shift_id' })
  cashShift: CashShift;

  @Column({ name: 'registered_by', type: 'uuid' })
  registeredById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registered_by' })
  registeredBy: User;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
