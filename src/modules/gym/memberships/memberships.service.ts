import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Membership } from './entities/membership.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async create(dto: CreateMembershipDto, companyId: string) {
    const client = await this.clientRepository.findOne({
      where: { id: dto.client_id, company_id: companyId },
    });
    if (!client)
      throw new NotFoundException(
        `Client ${dto.client_id} not found in this company`,
      );

    const membership = this.membershipRepository.create({
      client_id: dto.client_id,
      company_id: companyId,
      type: dto.type,
      start_date: new Date(dto.start_date),
      end_date: new Date(dto.end_date),
      is_active: true,
    });
    return this.membershipRepository.save(membership);
  }

  findByClient(clientId: string, companyId: string) {
    return this.membershipRepository.find({
      where: { client_id: clientId, company_id: companyId },
      order: { created_at: 'DESC' },
    });
  }

  findActive(clientId: string, companyId: string) {
    const today = new Date();
    return this.membershipRepository.findOne({
      where: {
        client_id: clientId,
        company_id: companyId,
        is_active: true,
        end_date: MoreThanOrEqual(today),
      },
    });
  }

  async deactivate(id: string, companyId: string) {
    const membership = await this.membershipRepository.findOne({
      where: { id, company_id: companyId },
    });
    if (!membership)
      throw new NotFoundException(`Membership ${id} not found`);
    await this.membershipRepository.update(id, { is_active: false });
    return { message: 'Membership deactivated' };
  }
}
