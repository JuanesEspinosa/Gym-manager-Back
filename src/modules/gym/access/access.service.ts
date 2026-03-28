import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { AccessLog } from './entities/access-log.entity';
import { Company } from '../../platform/companies/entities/company.entity';
import { ValidateAccessDto, AccessMethod } from './dto/validate-access.dto';

export interface AccessResult {
  granted: boolean;
  client_name?: string;
  reason?: string;
}

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(AccessLog)
    private accessLogRepository: Repository<AccessLog>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async validate(dto: ValidateAccessDto, companyId: string): Promise<AccessResult> {
    // 1. Buscar client por credencial
    let client: Client | null = null;
    if (dto.method === AccessMethod.RFID) {
      client = await this.clientRepository.findOne({
        where: { rfid_code: dto.credential, company_id: companyId, is_active: true },
      });
    } else {
      client = await this.clientRepository.findOne({
        where: { fingerprint_hash: dto.credential, company_id: companyId, is_active: true },
      });
    }

    if (!client) {
      return { granted: false, reason: 'client_not_found' };
    }

    // 2. Verificar licencia de la company
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['license'],
    });

    if (!company?.license?.is_active) {
      this.saveAccessLog(client.id, companyId, dto.location_id, dto.method, false);
      return { granted: false, reason: 'company_license_inactive' };
    }

    // 3. Verificar membresía activa
    const today = new Date();
    const membership = await this.membershipRepository.findOne({
      where: {
        client_id: client.id,
        company_id: companyId,
        is_active: true,
        end_date: MoreThanOrEqual(today),
      },
    });

    if (!membership) {
      this.saveAccessLog(client.id, companyId, dto.location_id, dto.method, false);
      return { granted: false, reason: 'no_active_membership' };
    }

    // 4. Acceso concedido — log fire-and-forget
    this.saveAccessLog(client.id, companyId, dto.location_id, dto.method, true);
    return { granted: true, client_name: client.full_name };
  }

  private saveAccessLog(
    clientId: string | null,
    companyId: string,
    locationId: string,
    method: string,
    granted: boolean,
  ): void {
    if (!clientId) return;

    const log = this.accessLogRepository.create({
      client_id: clientId,
      company_id: companyId,
      location_id: locationId,
      access_method: method as any,
      granted,
    });

    this.accessLogRepository.save(log).catch((err) =>
      console.error('AccessLog save failed:', err),
    );
  }
}
