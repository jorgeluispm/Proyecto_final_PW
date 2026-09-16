import {
  IsNumber,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsNumber()
  productVariantId: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  quantity: number;
}

export class PaymentItemDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

export class CreateOrderDto {
  @IsNumber()
  branchId: number;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments?: PaymentItemDto[];
}
