import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // 세션에 user 정보가 있는지 확인
    if (request.session && request.session.user) {
      return true;
    }
    throw new UnauthorizedException('로그인이 필요합니다.');
  }
}
