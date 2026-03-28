import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  findAll(companyId: string) {
    return this.clientRepository.find({
      where: { company_id: companyId, is_active: true },
    });
  }

  async findOne(id: string, companyId: string) {
    const client = await this.clientRepository.findOne({
      where: { id, company_id: companyId },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  findByRfid(rfidCode: string, companyId: string) {
    return this.clientRepository.findOne({
      where: { rfid_code: rfidCode, company_id: companyId, is_active: true },
    });
  }

  findByFingerprint(fingerprintHash: string, companyId: string) {
    return this.clientRepository.findOne({
      where: {
        fingerprint_hash: fingerprintHash,
        company_id: companyId,
        is_active: true,
      },
    });
  }

  create(dto: CreateClientDto, companyId: string) {
    const client = this.clientRepository.create({
      ...dto,
      company_id: companyId,
    });
    return this.clientRepository.save(client);
  }

  async update(id: string, dto: UpdateClientDto, companyId: string) {
    await this.findOne(id, companyId);
    await this.clientRepository.update({ id, company_id: companyId }, dto);
    return this.findOne(id, companyId);
  }

  async deactivate(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.clientRepository.update(
      { id, company_id: companyId },
      { is_active: false },
    );
    return { message: 'Client deactivated successfully' };
  }
}
