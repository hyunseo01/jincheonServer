import { Entity, Column, OneToMany } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { Team } from './team.entity';

@Entity()
export class Group extends CoreEntity {
  @Column()
  name: string; // 예: "진천 사무동 (CJ)", "진천 현장동 (JL)"

  @OneToMany(() => Team, (team) => team.group, { cascade: true })
  teams: Team[];
}
