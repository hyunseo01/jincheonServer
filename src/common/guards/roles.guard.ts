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
    // 1. 해당 핸들러(API)에 @Roles()가 붙어있는지 확인
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 권한 제한이 없으면 통과
    if (!requiredRoles) {
      return true;
    }

    // 2. 현재 로그인한 유저 정보 가져오기
    const request = context.switchToHttp().getRequest();
    const user = request.session.user; // 세션에서 유저 정보 꺼냄

    // 로그인이 안 되어 있거나 유저 정보가 없으면 차단 (AuthGuard가 먼저 막겠지만 혹시 몰라 추가)
    if (!user) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 3. 유저의 역할이 허용된 역할 목록에 있는지 확인
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return true;
  }
}
