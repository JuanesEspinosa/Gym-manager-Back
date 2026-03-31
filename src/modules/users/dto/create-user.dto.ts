import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum([UserRole.ADMIN])
  role: UserRole.ADMIN = UserRole.ADMIN;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  location_ids?: string[];
}
