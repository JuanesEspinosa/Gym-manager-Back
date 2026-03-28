import { IsEnum, IsDateString, IsUUID } from 'class-validator';
import { MembershipType } from '../entities/membership.entity';

export class CreateMembershipDto {
  @IsUUID()
  client_id: string;

  @IsEnum(MembershipType)
  type: MembershipType;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;
}
