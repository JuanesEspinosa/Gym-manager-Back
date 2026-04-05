import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AccessService } from './access.service';
import { ValidateAccessDto } from './dto/validate-access.dto';
import { QueryAccessLogsDto } from './dto/query-access-logs.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/access')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('validate')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER)
  validate(@Body() dto: ValidateAccessDto, @TenantId() companyId: string) {
    return this.accessService.validate(dto, companyId);
  }

  @Get('logs')
  @Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
  findLogs(@TenantId() companyId: string, @Query() query: QueryAccessLogsDto) {
    return this.accessService.findLogs(companyId, query);
  }

  @Get('logs/stats')
  @Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
  getLogStats(
    @TenantId() companyId: string,
    @Query() query: QueryAccessLogsDto,
  ) {
    return this.accessService.getLogStats(companyId, query);
  }
}
