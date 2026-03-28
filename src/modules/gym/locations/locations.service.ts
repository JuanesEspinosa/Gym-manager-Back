import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  findAll(companyId: string) {
    return this.locationRepository.find({ where: { company_id: companyId } });
  }

  async findOne(id: string, companyId: string) {
    const location = await this.locationRepository.findOne({
      where: { id, company_id: companyId },
    });
    if (!location) throw new NotFoundException(`Location ${id} not found`);
    return location;
  }

  create(dto: CreateLocationDto, companyId: string) {
    const location = this.locationRepository.create({
      ...dto,
      company_id: companyId,
    });
    return this.locationRepository.save(location);
  }

  async update(id: string, dto: UpdateLocationDto, companyId: string) {
    await this.findOne(id, companyId);
    await this.locationRepository.update({ id, company_id: companyId }, dto);
    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.locationRepository.delete({ id, company_id: companyId });
    return { message: 'Location deleted successfully' };
  }
}
