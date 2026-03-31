import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { Client } from '../gym/clients/entities/client.entity';
import { Location } from '../gym/locations/entities/location.entity';
import { SalesService } from './sales/sales.service';
import { SalesController } from './sales/sales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Client, Location])],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class AccountingModule {}
