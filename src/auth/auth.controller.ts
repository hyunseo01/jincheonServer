import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/user.decorator';
import { User, UserRole } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, UpdateUserByAdminDto } from './dto/update-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto);
    const accessToken = await this.authService.signAccessToken(user);
    return { accessToken, user };
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const newUser = await this.authService.register(createUserDto);
    return { id: newUser.id };
  }

  // JWT에서는 서버 로그아웃이 실질적으로 없음
  @Post('logout')
  async logout() {
    return { message: '로그아웃 되었습니다.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return user;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.authService.updateUser(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateUserByAdminDto,
  ) {
    return await this.authService.updateUser(id, dto);
  }
}
