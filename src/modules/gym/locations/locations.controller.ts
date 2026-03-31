import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/gym/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findAll(@TenantId() companyId: string, @CurrentUser() user: any) {
    return this.locationsService.findAll(
      companyId,
      user.role,
      user.location_ids,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() companyId: string) {
    return this.locationsService.findOne(id, companyId);
  }

  @Post()
  create(@Body() dto: CreateLocationDto, @TenantId() companyId: string) {
    return this.locationsService.create(dto, companyId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @TenantId() companyId: string,
  ) {
    return this.locationsService.update(id, dto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() companyId: string) {
    return this.locationsService.remove(id, companyId);
  }
}
