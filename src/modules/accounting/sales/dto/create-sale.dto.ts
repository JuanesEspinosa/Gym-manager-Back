import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../entities/sale.entity';

export class CreateSaleDto {
  @IsUUID()
  client_id: string;

  @IsUUID()
  location_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @MaxLength(500)
  concept: string;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;
}
