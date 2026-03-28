import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies/companies.controller';
import { CompaniesService } from './companies/companies.service';
import { LicensesController } from './licenses/licenses.controller';
import { LicensesService } from './licenses/licenses.service';
import { Company } from './companies/entities/company.entity';
import { License } from './licenses/entities/license.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, License])],
  controllers: [CompaniesController, LicensesController],
  providers: [CompaniesService, LicensesService],
  exports: [CompaniesService, LicensesService],
})
export class PlatformModule {}
