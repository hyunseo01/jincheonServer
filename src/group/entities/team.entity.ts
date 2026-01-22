import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { Group } from './group.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Team extends CoreEntity {
  @Column()
  name: string; // 예: "관리팀", "입출고팀"

  @ManyToOne(() => Group, (group) => group.teams, { onDelete: 'CASCADE' })
  group: Group;

  @OneToMany(() => User, (user) => user.team)
  users: User[];
}
