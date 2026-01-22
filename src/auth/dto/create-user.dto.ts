import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: '이메일 형식이 아닙니다.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  mobilePhone?: string;

  @IsString()
  @IsOptional()
  officePhone?: string;

  // role은 입력 안 하면 기본값(STAFF)으로 처리됨
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // 팀 배정을 위해 팀 ID를 받음 (UUID 형식 체크)
  @IsUUID()
  @IsOptional()
  teamId?: string;
}
