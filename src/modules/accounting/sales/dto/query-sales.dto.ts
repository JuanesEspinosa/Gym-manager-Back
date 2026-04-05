import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { PaymentMethod } from '../../entities/sale.entity';

export class QuerySalesDto {
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
