import { IsEnum, IsInt, IsDateString, IsUUID, Min } from 'class-validator';
import { PlanType } from '../entities/license.entity';

export class CreateLicenseDto {
  @IsUUID()
  company_id: string;

  @IsEnum(PlanType)
  plan_type: PlanType;

  @IsInt()
  @Min(1)
  max_locations: number;

  @IsDateString()
  valid_until: string;
}
