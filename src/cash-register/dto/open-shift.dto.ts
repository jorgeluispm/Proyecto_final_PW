import { IsInt, IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class OpenShiftDto {
  @IsInt()
  @IsNotEmpty()
  branchId: number;

  @IsUUID()
  @IsNotEmpty()
  openedById: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El fondo inicial debe ser mayor o igual a 0' })
  initialCash: number;
}
