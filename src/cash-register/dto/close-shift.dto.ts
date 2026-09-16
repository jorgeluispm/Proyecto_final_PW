import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class CloseShiftDto {
  @IsUUID()
  @IsNotEmpty()
  closedById: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El efectivo real contado debe ser mayor o igual a 0' })
  finalCashReal: number;
}
