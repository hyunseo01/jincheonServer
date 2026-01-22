import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Session,
  Res,
  Patch,
  Param,
} from '@nestjs/common';
import * as express from 'express'; // express 타입 사용
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { User, UserRole } from './entities/user.entity';

// DTO import
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, UpdateUserByAdminDto } from './dto/update-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Session() session: Record<string, any>,
  ) {
    const user = await this.authService.validateUser(loginDto);
    session.user = user;

    // [수정] { success, user } 객체를 리턴하지 않고, user만 리턴합니다.
    // Interceptor가 자동으로 { success: true, data: user } 형태로 감싸줍니다.
    return user;
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const newUser = await this.authService.register(createUserDto);

    // [수정] 순수 데이터만 리턴
    return { id: newUser.id };
  }

  @Post('logout')
  async logout(
    @Session() session: Record<string, any>,
    // [수정] passthrough: true를 써야 인터셉터가 동작합니다.
    @Res({ passthrough: true }) res: express.Response,
  ) {
    // 세션 삭제를 Promise로 감싸서 비동기 처리
    await new Promise<void>((resolve, reject) => {
      session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.clearCookie('connect.sid');

    // [수정] 리턴값을 주면 인터셉터가 data 안에 넣어줍니다.
    return { message: '로그아웃 되었습니다.' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    // [수정] user 객체만 리턴 (이미 올바르게 되어 있었음)
    return user;
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    const updatedUser = await this.authService.updateUser(user.id, dto);

    // [수정] 불필요한 메시지 제거, 업데이트된 유저 객체만 리턴
    return updatedUser;
  }

  // 관리자용 유저 수정
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateUserByAdminDto,
  ) {
    const updatedUser = await this.authService.updateUser(id, dto);

    // [수정] 업데이트된 유저 객체만 리턴
    return updatedUser;
  }
}
