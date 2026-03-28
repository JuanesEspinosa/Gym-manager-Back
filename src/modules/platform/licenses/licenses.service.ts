import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License } from './entities/license.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateLicenseDto } from './dto/create-license.dto';

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async create(dto: CreateLicenseDto) {
    const company = await this.companyRepository.findOne({
      where: { id: dto.company_id },
    });
    if (!company)
      throw new NotFoundException(`Company ${dto.company_id} not found`);

    const license = this.licenseRepository.create({
      plan_type: dto.plan_type,
      max_locations: dto.max_locations,
      valid_until: new Date(dto.valid_until),
      is_active: true,
    });
    const savedLicense = await this.licenseRepository.save(license);

    // Assign license to the company
    await this.companyRepository.update(dto.company_id, {
      license: savedLicense,
    });

    return savedLicense;
  }

  async findByCompany(companyId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['license'],
    });
    if (!company)
      throw new NotFoundException(`Company ${companyId} not found`);

    return company.license ? [company.license] : [];
  }

  async activate(id: string) {
    const license = await this.licenseRepository.findOne({ where: { id } });
    if (!license) throw new NotFoundException(`License ${id} not found`);
    await this.licenseRepository.update(id, { is_active: true });
    return this.licenseRepository.findOne({ where: { id } });
  }

  async deactivate(id: string) {
    const license = await this.licenseRepository.findOne({ where: { id } });
    if (!license) throw new NotFoundException(`License ${id} not found`);
    await this.licenseRepository.update(id, { is_active: false });
    return this.licenseRepository.findOne({ where: { id } });
  }
}
