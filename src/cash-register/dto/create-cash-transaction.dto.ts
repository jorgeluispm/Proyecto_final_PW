import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCashTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  cashShiftId: string;

  @IsUUID()
  @IsNotEmpty()
  registeredById: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto del egreso debe ser mayor a 0' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El motivo de la salida debe ser descriptivo' })
  reason: string;
}
