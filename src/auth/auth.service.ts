import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  OnApplicationBootstrap,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as argon2 from 'argon2';
import { Team } from '../group/entities/team.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserByAdminDto } from './dto/update-user.dto';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
  ) {}

  // [수정됨] 서버 시작 시 '개발자(마스터)' 계정 확인 및 생성
  async onApplicationBootstrap() {
    // 1. DEVELOPER(개발자) 권한을 가진 유저가 있는지 확인
    const masterExists = await this.userRepo.findOne({
      where: { role: UserRole.DEVELOPER },
    });

    if (!masterExists) {
      console.log('⚡ 시스템 마스터(개발자) 계정이 없어 생성합니다...');

      // 마스터 계정 정보 (프론트엔드 예시 데이터 반영)
      await this.register({
        email: 'dev@dev.com',
        password: '1234',
        name: '마스터계정',
        role: UserRole.DEVELOPER,
      });

      console.log('마스터 계정 생성 완료');
    }
  }

  // [회원가입] - Argon2 적용
  async register(dto: CreateUserDto) {
    // 1. 이메일 중복 체크
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('이미 존재하는 이메일입니다.');

    // 2. 팀 조회
    let team: Team | null = null;
    if (dto.teamId) {
      team = await this.teamRepo.findOne({ where: { id: dto.teamId } });
      if (!team) throw new NotFoundException('존재하지 않는 팀 ID입니다.');
    }

    // 3. 비밀번호 해싱
    const hashedPassword = await argon2.hash(dto.password);

    // 4. 유저 생성 및 저장
    const newUser = this.userRepo.create({
      ...dto,
      password: hashedPassword,
      // [수정] team이 null일 경우 undefined로 변환 (|| undefined 추가)
      team: team || undefined,
    });

    return await this.userRepo.save(newUser);
  }

  // [로그인 검증]
  async validateUser(dto: LoginDto): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'role', 'name', 'mobilePhone'], // 보안상 필요한 필드만 명시
      relations: ['team', 'team.group'], // 소속 정보 로딩
    });

    if (!user) throw new UnauthorizedException('존재하지 않는 계정입니다.');

    // 해시 검증
    const isMatch = await argon2.verify(user.password, dto.password);
    if (!isMatch) throw new UnauthorizedException('비밀번호가 틀렸습니다.');

    // 세션에 저장할 때는 비밀번호 제거
    const { password, ...result } = user;
    return result as User;
  }

  async updateUser(id: string, dto: UpdateUserByAdminDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 1. 비밀번호 변경 요청이 있다면 해싱
    if (dto.password) {
      dto.password = await argon2.hash(dto.password);
    }

    // 2. 팀 변경 요청이 있다면 팀 엔티티 조회
    let team: Team | undefined;
    if (dto.teamId) {
      const teamEntity = await this.teamRepo.findOne({
        where: { id: dto.teamId },
      });
      if (!teamEntity) throw new NotFoundException('존재하지 않는 팀입니다.');
      team = teamEntity;
    }

    // 3. 업데이트 수행
    // dto에 있는 값들만 덮어씌움. teamId는 별도 처리했으므로 제거 후 team 엔티티 주입
    const { teamId, ...updateData } = dto;

    // team이 undefined면 업데이트 안 함 (기존 유지), 객체면 업데이트
    const newAttributes = { ...updateData };
    if (team) {
      Object.assign(newAttributes, { team });
    } else if (dto.teamId === null) {
      // 팀을 빼버리고 싶을 때 (null을 보낸 경우)
      Object.assign(newAttributes, { team: null });
    }

    await this.userRepo.update(id, newAttributes);

    const updatedUser = await this.userRepo.findOne({
      where: { id },
      relations: ['team', 'team.group'],
    });

    if (!updatedUser) {
      throw new NotFoundException('사용자 정보를 불러올 수 없습니다.');
    }

    const { password: password, ...result } = updatedUser;

    return result;
  }
}
