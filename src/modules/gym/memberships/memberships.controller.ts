import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/gym/memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  create(@Body() dto: CreateMembershipDto, @TenantId() companyId: string) {
    return this.membershipsService.create(dto, companyId);
  }

  @Get('client/:clientId')
  findByClient(
    @Param('clientId') clientId: string,
    @TenantId() companyId: string,
  ) {
    return this.membershipsService.findByClient(clientId, companyId);
  }

  @Get('client/:clientId/active')
  findActive(
    @Param('clientId') clientId: string,
    @TenantId() companyId: string,
  ) {
    return this.membershipsService.findActive(clientId, companyId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @TenantId() companyId: string) {
    return this.membershipsService.deactivate(id, companyId);
  }
}
