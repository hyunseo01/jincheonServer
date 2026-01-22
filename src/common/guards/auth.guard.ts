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

    // [확인] 브라우저에서 보낸 쿠키가 세션 미들웨어를 거쳐 request.session에 제대로 들어왔는지 확인
    console.log('--- AuthGuard Check ---');
    console.log('Session ID:', request.sessionID);

    console.log('Session User:', request.session?.user);

    if (request.session && request.session.user) {
      return true;
    }

    // 만약 로그가 찍히는데 user가 없다면 세션 저장이 안 된 것이고,
    // Session ID 자체가 매번 바뀐다면 쿠키가 안 넘어오는 것입니다.
    throw new UnauthorizedException('로그인이 필요합니다.');
  }
}
