import { Entity, Column, OneToMany } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { IssueTag } from './issue-tag.entity';
import { IssueTimeline } from './issue-timeline.entity';
import { BadgeColor, IssueStatus } from '../issue.constant';

@Entity()
export class Issue extends CoreEntity {
  @Column()
  title: string;

  @Column('text')
  content: string; // preview + description

  @Column()
  authorName: string; // 작성자 이름 (이력 보존용)

  // 작성자 ID (선택사항: User 테이블과 연결이 필요하면 추가, 없으면 이름만 보존)
  @Column({ nullable: true })
  authorId: string;

  @Column({ type: 'timestamp', nullable: true })
  bumpedAt: Date; // 끌올 시간

  @Column({
    type: 'enum',
    enum: IssueStatus,
    default: IssueStatus.IN_PROGRESS,
  })
  status: IssueStatus;

  @Column('simple-array', { nullable: true })
  mentions: string[];

  // Priority
  @Column({ nullable: true })
  priorityText: string;

  @Column({ type: 'enum', enum: BadgeColor, nullable: true })
  priorityColor: BadgeColor;

  // Relations
  @OneToMany(() => IssueTag, (tag) => tag.issue, { cascade: true })
  tags: IssueTag[];

  @OneToMany(() => IssueTimeline, (timeline) => timeline.issue, {
    cascade: true,
  })
  timelines: IssueTimeline[];
}
