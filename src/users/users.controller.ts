import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard) // 로그인 & 권한 체크 필수
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. 전체 유저 조회 (GET /users)
  // 프론트엔드의 getAllUsers()와 매칭됨
  @Get()
  // @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER) // 필요 시 주석 해제하여 접근 제한
  async findAll() {
    return this.usersService.findAll();
  }

  // 2. 유저 삭제 (DELETE /users/:id)
  // 프론트엔드의 deleteUser()와 매칭됨
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER) // 관리자/개발자만 삭제 가능
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { success: true, message: '사용자가 삭제되었습니다.' };
  }
}
