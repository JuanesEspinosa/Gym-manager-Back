import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/gym/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@TenantId() companyId: string) {
    return this.clientsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() companyId: string) {
    return this.clientsService.findOne(id, companyId);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @TenantId() companyId: string) {
    return this.clientsService.create(dto, companyId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @TenantId() companyId: string,
  ) {
    return this.clientsService.update(id, dto, companyId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @TenantId() companyId: string) {
    return this.clientsService.deactivate(id, companyId);
  }
}
