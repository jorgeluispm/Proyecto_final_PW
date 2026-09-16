import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { PaymentDetail } from './payment-detail.entity';
import { CashShift } from '../../cash-register/entities/cash-shift.entity';
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  YAPPY = 'YAPPY',
  CARD = 'CARD',
  SPLIT = 'SPLIT',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cash_shift_id', type: 'uuid' })
  cashShiftId: string;

  @ManyToOne(() => CashShift, (shift) => shift.orders)
  @JoinColumn({ name: 'cash_shift_id' })
  cashShift: CashShift;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({
    name: 'invoice_number',
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
  })
  invoiceNumber: string;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 100,
    default: 'Cliente General',
  })
  customerName: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.OPEN })
  status: OrderStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0.0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0.0 })
  total: number;

  @Column({
    name: 'amount_paid',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  amountPaid: number;

  @Column({
    name: 'change_due',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  changeDue: number;

  @Column({ name: 'void_reason', type: 'text', nullable: true })
  voidReason: string;

  @Column({ name: 'voided_by', type: 'uuid', nullable: true })
  voidedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'voided_by' })
  voidedBy: User;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => PaymentDetail, (payment) => payment.order, { cascade: true })
  payments: PaymentDetail[];
}
