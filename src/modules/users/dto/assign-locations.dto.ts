import { IsArray, IsUUID } from 'class-validator';

export class AssignLocationsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  location_ids: string[];
}
