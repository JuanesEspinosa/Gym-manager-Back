import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Client } from '../../gym/clients/entities/client.entity';
import { Location } from '../../gym/locations/entities/location.entity';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(dto: CreateSaleDto, companyId: string, adminId: string) {
    const client = await this.clientRepository.findOne({
      where: { id: dto.client_id, company_id: companyId },
    });
    if (!client)
      throw new NotFoundException(
        `Client ${dto.client_id} not found in this company`,
      );

    const location = await this.locationRepository.findOne({
      where: { id: dto.location_id, company_id: companyId },
    });
    if (!location)
      throw new NotFoundException(
        `Location ${dto.location_id} not found in this company`,
      );

    const sale = this.saleRepository.create({
      client_id: dto.client_id,
      company_id: companyId,
      location_id: dto.location_id,
      admin_id: adminId,
      amount: dto.amount,
      concept: dto.concept,
      payment_method: dto.payment_method,
    });
    return this.saleRepository.save(sale);
  }

  findAll(companyId: string, locationId?: string) {
    const where: Record<string, unknown> = { company_id: companyId };
    if (locationId) where.location_id = locationId;
    return this.saleRepository.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['client', 'location'],
    });
  }
}
