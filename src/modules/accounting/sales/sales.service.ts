import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Client } from '../../gym/clients/entities/client.entity';
import { Location } from '../../gym/locations/entities/location.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';

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

  findAll(companyId: string, query: QuerySalesDto) {
    const where: Record<string, unknown> = { company_id: companyId };

    if (query.location_id) where.location_id = query.location_id;
    if (query.payment_method) where.payment_method = query.payment_method;

    if (query.start_date && query.end_date) {
      where.created_at = Between(
        new Date(query.start_date),
        new Date(query.end_date + 'T23:59:59.999Z'),
      );
    } else if (query.start_date) {
      where.created_at = MoreThanOrEqual(new Date(query.start_date));
    } else if (query.end_date) {
      where.created_at = LessThanOrEqual(
        new Date(query.end_date + 'T23:59:59.999Z'),
      );
    }

    return this.saleRepository.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['client', 'location'],
    });
  }

  async getStats(companyId: string, query: QuerySalesDto) {
    const qb = this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.company_id = :companyId', { companyId });

    if (query.location_id) {
      qb.andWhere('sale.location_id = :locationId', {
        locationId: query.location_id,
      });
    }
    if (query.payment_method) {
      qb.andWhere('sale.payment_method = :method', {
        method: query.payment_method,
      });
    }
    if (query.start_date) {
      qb.andWhere('sale.created_at >= :startDate', {
        startDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      qb.andWhere('sale.created_at <= :endDate', {
        endDate: new Date(query.end_date + 'T23:59:59.999Z'),
      });
    }

    // Total general
    const totalResult = await qb
      .select('COALESCE(SUM(sale.amount), 0)', 'total')
      .addSelect('COUNT(sale.id)', 'count')
      .getRawOne();

    // Por método de pago
    const byPaymentMethod = await qb
      .select('sale.payment_method', 'payment_method')
      .addSelect('COALESCE(SUM(sale.amount), 0)', 'total')
      .addSelect('COUNT(sale.id)', 'count')
      .groupBy('sale.payment_method')
      .getRawMany();

    // Por sede
    const byLocationQb = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoin('sale.location', 'location')
      .where('sale.company_id = :companyId', { companyId });

    if (query.start_date) {
      byLocationQb.andWhere('sale.created_at >= :startDate', {
        startDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      byLocationQb.andWhere('sale.created_at <= :endDate', {
        endDate: new Date(query.end_date + 'T23:59:59.999Z'),
      });
    }

    const byLocation = await byLocationQb
      .select('sale.location_id', 'location_id')
      .addSelect('location.name', 'location_name')
      .addSelect('COALESCE(SUM(sale.amount), 0)', 'total')
      .addSelect('COUNT(sale.id)', 'count')
      .groupBy('sale.location_id')
      .addGroupBy('location.name')
      .getRawMany();

    // Ventas recientes (últimas 10)
    const recentQb = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.location', 'location')
      .where('sale.company_id = :companyId', { companyId })
      .orderBy('sale.created_at', 'DESC')
      .limit(10);

    if (query.location_id) {
      recentQb.andWhere('sale.location_id = :locationId', {
        locationId: query.location_id,
      });
    }

    const recent = await recentQb.getMany();

    return {
      total: Number(totalResult.total),
      count: Number(totalResult.count),
      by_payment_method: byPaymentMethod.map((r) => ({
        payment_method: r.payment_method,
        total: Number(r.total),
        count: Number(r.count),
      })),
      by_location: byLocation.map((r) => ({
        location_id: r.location_id,
        location_name: r.location_name,
        total: Number(r.total),
        count: Number(r.count),
      })),
      recent,
    };
  }
}
