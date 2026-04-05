import { IsOptional, IsUUID, IsDateString, IsEnum, IsBooleanString } from 'class-validator';
import { AccessMethod } from '../entities/access-log.entity';

export class QueryAccessLogsDto {
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsBooleanString()
  granted?: string;

  @IsOptional()
  @IsEnum(AccessMethod)
  method?: AccessMethod;
}
