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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignLocationsDto } from './dto/assign-locations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('v1/platform/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@TenantId() companyId: string) {
    return this.usersService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() companyId: string) {
    return this.usersService.findOne(id, companyId);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @TenantId() companyId: string) {
    return this.usersService.create(dto, companyId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @TenantId() companyId: string,
  ) {
    return this.usersService.update(id, dto, companyId);
  }

  @Put(':id/locations')
  assignLocations(
    @Param('id') id: string,
    @Body() dto: AssignLocationsDto,
    @TenantId() companyId: string,
  ) {
    return this.usersService.assignLocations(id, dto, companyId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @TenantId() companyId: string) {
    return this.usersService.deactivate(id, companyId);
  }
}
