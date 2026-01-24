import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { success: true, message: '사용자가 삭제되었습니다.' };
  }
}
