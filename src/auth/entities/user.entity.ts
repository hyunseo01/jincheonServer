import { Entity, Column, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { Team } from '../../group/entities/team.entity';

export enum UserRole {
  DEVELOPER = 'developer',
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

@Entity()
export class User extends CoreEntity {
  @Column({ unique: true })
  email: string; // [변경] 로그인 ID 겸 이메일

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  // [변경] 연락처 분리
  @Column({ nullable: true })
  mobilePhone: string; // 휴대전화

  @Column({ nullable: true })
  officePhone: string; // 사무실전화

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role: UserRole;

  @ManyToOne(() => Team, (team) => team.users, { nullable: true })
  team: Team;
}
