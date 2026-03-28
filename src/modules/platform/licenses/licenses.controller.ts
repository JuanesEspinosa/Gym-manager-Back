import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/platform/licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  create(@Body() dto: CreateLicenseDto) {
    return this.licensesService.create(dto);
  }

  @Get()
  findByCompany(@Query('company_id') companyId: string) {
    return this.licensesService.findByCompany(companyId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.licensesService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.licensesService.deactivate(id);
  }
}
