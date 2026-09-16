import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CashTransaction } from './cash-transaction.entity';
import { Order } from '../../sales/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('cash_shifts')
export class CashShift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'int' })
  branchId: number;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'opened_by', type: 'uuid' })
  openedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  openedBy: User;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'closed_by' })
  closedBy: User;

  @Column({ name: 'initial_cash', type: 'numeric', precision: 10, scale: 2 })
  initialCash: number;

  @Column({
    name: 'final_cash_calculated',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  finalCashCalculated: number;

  @Column({
    name: 'final_cash_real',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  finalCashReal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  difference: number;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  @CreateDateColumn({ name: 'opened_at' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @OneToMany(() => CashTransaction, (tx) => tx.cashShift)
  transactions: CashTransaction[];

  @OneToMany(() => Order, (order) => order.cashShift)
  orders: Order[];
}
