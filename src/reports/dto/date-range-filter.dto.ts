import { IsOptional, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class DateRangeFilterDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
