import { Entity, Column, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { Issue } from './issue.entity';

export enum TimelineType {
  COMMENT = 'COMMENT',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

@Entity()
export class IssueTimeline extends CoreEntity {
  @Column()
  authorName: string;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: TimelineType })
  type: TimelineType;

  @ManyToOne(() => Issue, (issue) => issue.timelines, { onDelete: 'CASCADE' })
  issue: Issue;
}
