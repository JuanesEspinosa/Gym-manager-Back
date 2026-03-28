import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  findAll() {
    return this.companyRepository.find({ relations: ['license'] });
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['license'],
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  create(dto: CreateCompanyDto) {
    const company = this.companyRepository.create(dto);
    return this.companyRepository.save(company);
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    await this.companyRepository.update(id, dto);
    return this.findOne(id);
  }

  async activate(id: string) {
    await this.findOne(id);
    await this.companyRepository.update(id, { is_active: true });
    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.companyRepository.update(id, { is_active: false });
    return this.findOne(id);
  }
}
