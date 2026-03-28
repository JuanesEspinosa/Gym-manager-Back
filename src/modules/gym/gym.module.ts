import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations/locations.controller';
import { LocationsService } from './locations/locations.service';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { MembershipsController } from './memberships/memberships.controller';
import { MembershipsService } from './memberships/memberships.service';
import { AccessController } from './access/access.controller';
import { AccessService } from './access/access.service';
import { Location } from './locations/entities/location.entity';
import { Client } from './clients/entities/client.entity';
import { Membership } from './memberships/entities/membership.entity';
import { AccessLog } from './access/entities/access-log.entity';
import { Company } from '../platform/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location, Client, Membership, AccessLog, Company])],
  controllers: [LocationsController, ClientsController, MembershipsController, AccessController],
  providers: [LocationsService, ClientsService, MembershipsService, AccessService],
  exports: [LocationsService, ClientsService, MembershipsService, AccessService],
})
export class GymModule {}
