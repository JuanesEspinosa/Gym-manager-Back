import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  MoreThanOrEqual,
  Between,
  LessThanOrEqual,
} from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { AccessLog } from './entities/access-log.entity';
import { Company } from '../../platform/companies/entities/company.entity';
import { ValidateAccessDto, AccessMethod } from './dto/validate-access.dto';
import { QueryAccessLogsDto } from './dto/query-access-logs.dto';

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

  findLogs(companyId: string, query: QueryAccessLogsDto) {
    const where: Record<string, unknown> = { company_id: companyId };

    if (query.location_id) where.location_id = query.location_id;
    if (query.granted !== undefined) where.granted = query.granted === 'true';
    if (query.method) where.access_method = query.method;

    if (query.start_date && query.end_date) {
      where.timestamp = Between(
        new Date(query.start_date),
        new Date(query.end_date + 'T23:59:59.999Z'),
      );
    } else if (query.start_date) {
      where.timestamp = MoreThanOrEqual(new Date(query.start_date));
    } else if (query.end_date) {
      where.timestamp = LessThanOrEqual(
        new Date(query.end_date + 'T23:59:59.999Z'),
      );
    }

    return this.accessLogRepository.find({
      where,
      order: { timestamp: 'DESC' },
      relations: ['client', 'location'],
      take: 200,
    });
  }

  async getLogStats(companyId: string, query: QueryAccessLogsDto) {
    const qb = this.accessLogRepository
      .createQueryBuilder('log')
      .where('log.company_id = :companyId', { companyId });

    if (query.location_id) {
      qb.andWhere('log.location_id = :locationId', {
        locationId: query.location_id,
      });
    }
    if (query.start_date) {
      qb.andWhere('log.timestamp >= :startDate', {
        startDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      qb.andWhere('log.timestamp <= :endDate', {
        endDate: new Date(query.end_date + 'T23:59:59.999Z'),
      });
    }

    const totals = await qb
      .select('COUNT(log.id)', 'total')
      .addSelect("SUM(CASE WHEN log.granted = true THEN 1 ELSE 0 END)", 'granted')
      .addSelect("SUM(CASE WHEN log.granted = false THEN 1 ELSE 0 END)", 'denied')
      .getRawOne();

    const byLocation = await this.accessLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.location', 'location')
      .where('log.company_id = :companyId', { companyId })
      .andWhere(query.start_date ? 'log.timestamp >= :startDate' : '1=1', {
        startDate: query.start_date ? new Date(query.start_date) : undefined,
      })
      .andWhere(query.end_date ? 'log.timestamp <= :endDate' : '1=1', {
        endDate: query.end_date
          ? new Date(query.end_date + 'T23:59:59.999Z')
          : undefined,
      })
      .select('log.location_id', 'location_id')
      .addSelect('location.name', 'location_name')
      .addSelect('COUNT(log.id)', 'total')
      .addSelect("SUM(CASE WHEN log.granted = true THEN 1 ELSE 0 END)", 'granted')
      .addSelect("SUM(CASE WHEN log.granted = false THEN 1 ELSE 0 END)", 'denied')
      .groupBy('log.location_id')
      .addGroupBy('location.name')
      .getRawMany();

    return {
      total: Number(totals.total),
      granted: Number(totals.granted),
      denied: Number(totals.denied),
      by_location: byLocation.map((r) => ({
        location_id: r.location_id,
        location_name: r.location_name,
        total: Number(r.total),
        granted: Number(r.granted),
        denied: Number(r.denied),
      })),
    };
  }
}
