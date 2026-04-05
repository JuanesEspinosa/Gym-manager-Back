import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/accounting/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @Body() dto: CreateSaleDto,
    @TenantId() companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.salesService.create(dto, companyId, user.id);
  }

  @Get()
  findAll(@TenantId() companyId: string, @Query() query: QuerySalesDto) {
    return this.salesService.findAll(companyId, query);
  }

  @Get('stats')
  getStats(@TenantId() companyId: string, @Query() query: QuerySalesDto) {
    return this.salesService.getStats(companyId, query);
  }
}
