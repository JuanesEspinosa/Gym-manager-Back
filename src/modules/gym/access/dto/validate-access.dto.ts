import { IsUUID, IsEnum, IsString, IsNotEmpty } from 'class-validator';

export enum AccessMethod {
  RFID = 'rfid',
  FINGERPRINT = 'fingerprint',
}

export class ValidateAccessDto {
  @IsUUID()
  location_id: string;

  @IsEnum(AccessMethod)
  method: AccessMethod;

  @IsString()
  @IsNotEmpty()
  credential: string;
}
