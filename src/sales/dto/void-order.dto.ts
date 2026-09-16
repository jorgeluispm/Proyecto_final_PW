import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VoidOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio' })
  @MinLength(5, {
    message: 'El motivo de anulación debe contener al menos 5 caracteres',
  })
  reason: string;
}
