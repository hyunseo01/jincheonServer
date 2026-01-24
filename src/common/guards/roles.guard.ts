import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../auth/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new ForbiddenException('로그인이 필요합니다.');

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) throw new ForbiddenException('접근 권한이 없습니다.');

    return true;
  }
}
