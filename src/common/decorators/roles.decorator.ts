import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../auth/entities/user.entity';

export const ROLES_KEY = 'roles';
// @Roles(UserRole.ADMIN, UserRole.MANAGER) 처럼 사용
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
