import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  mobilePhone?: string;

  @IsString()
  @IsOptional()
  officePhone?: string;

  @IsString()
  @IsOptional()
  @MinLength(4)
  password?: string; // 비밀번호 변경 희망 시에만 보냄
}

export class UpdateUserByAdminDto extends UpdateProfileDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  // 관리자는 이메일(ID)도 수정해줄 수 있음
  @IsString()
  @IsOptional()
  email?: string;
}
