import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '../../modules/auth/entities/user.entity';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.role !== UserRole.SUPER_ADMIN) {
      request.tenantId = user.company_id;
    }

    return next.handle();
  }
}
