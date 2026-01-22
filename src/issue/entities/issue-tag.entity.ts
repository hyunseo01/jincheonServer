import { Entity, Column, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { BadgeColor } from '../issue.constant';
import { Issue } from './issue.entity';

@Entity()
export class IssueTag extends CoreEntity {
  @Column()
  text: string;

  @Column({ type: 'enum', enum: BadgeColor, default: BadgeColor.GRAY })
  color: BadgeColor;

  @ManyToOne(() => Issue, (issue) => issue.tags, { onDelete: 'CASCADE' })
  issue: Issue;
}
