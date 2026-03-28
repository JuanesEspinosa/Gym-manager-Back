import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AccessService } from './access.service';
import { ValidateAccessDto } from './dto/validate-access.dto';
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
}
