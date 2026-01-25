import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Issue } from './entities/issue.entity';
import { IssueTimeline, TimelineType } from './entities/issue-timeline.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { BadgeColor, IssueStatus } from './issue.constant';
import { CreateCommentDto } from './dto/create-comment.dto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// 카테고리별 색상 매핑 (프론트와 통일)
const CATEGORY_MAP: Record<string, BadgeColor> = {
  긴급: BadgeColor.RED,
  중요: BadgeColor.YELLOW,
  데일리: BadgeColor.GRAY,
  입출고: BadgeColor.BLUE,
  배차: BadgeColor.PURPLE,
};

function toUtcMs(v: unknown): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return dayjs.utc(v).valueOf(); // 문자열도 UTC로 강제
  return 0;
}

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    @InjectRepository(IssueTimeline)
    private readonly timelineRepo: Repository<IssueTimeline>,
  ) {}

  // 1. 이슈 생성
  async create(dto: CreateIssueDto, user: { name: string; id: string }) {
    // 1) 멘션 파싱 (@이름)
    const mentions = this.extractMentions(dto.description);

    // 2) 태그 및 우선순위 처리
    // 첫 번째 카테고리를 Priority로 빼고, 나머지만 tags로 저장 (중복 방지)
    const [firstCategory, ...restCategories] = dto.categories ?? [];

    const priorityText = firstCategory || '일반';
    const priorityColor = CATEGORY_MAP[priorityText] || BadgeColor.GRAY;

    const newIssue = this.issueRepo.create({
      title: dto.title,
      content: dto.description,
      authorName: user.name,
      authorId: user.id,
      mentions,
      priorityText,
      priorityColor,

      // Priority(첫 카테고리)는 제외하고 나머지만 tags로 저장
      tags: restCategories.map((cat) => ({
        text: cat,
        color: CATEGORY_MAP[cat] || BadgeColor.GRAY,
      })),

      timelines: [
        {
          authorName: '시스템',
          content: '이슈가 등록되었습니다.',
          type: TimelineType.STATUS_CHANGE,
        },
      ],
    });

    return await this.issueRepo.save(newIssue);
  }

  // 2. 전체 조회 (정렬: 끌올 최신순 > 생성 최신순)
  async findAll() {
    // [조건 1] 완료된 지 3일 지난 이슈 숨기기 위한 기준 시간
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 1. 일단 DB에서 필터링 조건에 맞는 데이터를 다 가져옵니다.
    // (여기서는 정렬을 하지 않고 가져옵니다)
    const issues = await this.issueRepo.find({
      relations: ['tags'],
      where: [
        { status: IssueStatus.IN_PROGRESS }, // 진행중은 무조건 가져옴
        {
          status: IssueStatus.DONE,
          updatedAt: MoreThanOrEqual(threeDaysAgo), // 완료됨은 3일 이내만
        },
      ],
    });

    // 2. 메모리에서 정렬 (원하는 복합 로직 적용)
    return issues.sort((a, b) => {
      // 1순위: 상태 정렬 (진행중이 위로)
      // IN_PROGRESS가 DONE보다 위로 가야 함
      if (a.status !== b.status) {
        return a.status === IssueStatus.IN_PROGRESS ? -1 : 1;
      }

      // 2순위: '유효 시간' 정렬 (최신순)
      // bumpedAt이 있으면 그것을, 없으면 createdAt을 기준 시간으로 잡음
      const timeA = a.bumpedAt ? toUtcMs(a.bumpedAt) : toUtcMs(a.createdAt);
      const timeB = b.bumpedAt ? toUtcMs(b.bumpedAt) : toUtcMs(b.createdAt);

      return timeB - timeA; // 내림차순 (큰 숫자가 위로 = 최신이 위로)
    });
  }

  // 3. 상세 조회
  async findOne(id: string) {
    const issue = await this.issueRepo.findOne({
      where: { id },
      relations: ['tags', 'timelines'],
      order: {
        timelines: { createdAt: 'ASC' }, // 타임라인은 과거순
      },
    });
    if (!issue) throw new NotFoundException('이슈를 찾을 수 없습니다.');
    return issue;
  }

  // 4. 댓글 작성
  async addComment(id: string, dto: CreateCommentDto, user: { name: string }) {
    const issue = await this.findOne(id);

    // 멘션 업데이트 (댓글에 새로운 멘션이 있으면 추가)
    const newMentions = this.extractMentions(dto.content);
    if (newMentions.length > 0) {
      const existing = issue.mentions || [];
      issue.mentions = [...new Set([...existing, ...newMentions])];
      await this.issueRepo.save(issue);
    }

    const timeline = this.timelineRepo.create({
      issue,
      authorName: user.name,
      content: dto.content,
      type: TimelineType.COMMENT,
    });
    return await this.timelineRepo.save(timeline);
  }

  // 5. 끌올 (Bump)
  async bump(id: string, user: { name: string }) {
    const issue = await this.findOne(id);
    issue.bumpedAt = new Date(); // 현재 시간으로 업데이트

    // 타임라인 추가
    const timeline = this.timelineRepo.create({
      issue,
      authorName: '시스템',
      content: `${user.name} 님이 이슈를 최상단으로 '끌올' 했습니다.`,
      type: TimelineType.STATUS_CHANGE,
    });

    await this.timelineRepo.save(timeline);
    return await this.issueRepo.save(issue);
  }

  // 6. 상태 변경 (완료/진행중)
  async toggleStatus(id: string, user: { name: string }) {
    const issue = await this.findOne(id);
    const nextStatus =
      issue.status === IssueStatus.IN_PROGRESS
        ? IssueStatus.DONE
        : IssueStatus.IN_PROGRESS;

    issue.status = nextStatus;

    const timeline = this.timelineRepo.create({
      issue,
      authorName: user.name,
      content: `${user.name} 님이 상태를 '${nextStatus === IssueStatus.DONE ? '완료' : '진행중'}'으로 변경했습니다.`,
      type: TimelineType.STATUS_CHANGE,
    });

    await this.timelineRepo.save(timeline);
    return await this.issueRepo.save(issue);
  }

  async hardDelete(id: string, user: { id: string; role?: string }) {
    const issue = await this.issueRepo.findOne({ where: { id } });
    if (!issue) throw new NotFoundException('이슈를 찾을 수 없습니다.');

    const role = user.role;
    const isAdminOrDev = role === 'admin' || role === 'developer';
    const isOwner = !!issue.authorId && issue.authorId === user.id;

    if (!isAdminOrDev && !isOwner) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    // 안전: 타임라인/태그가 FK로 issue를 물고 있으니 먼저 지워줌
    // (cascade/remove 설정이 애매하면 이 방식이 가장 확실함)
    await this.timelineRepo.delete({ issue: { id } as any });
    // IssueTag는 별도 repo가 없다면 cascade on delete가 걸려있을 수도 있는데,
    // 확실히 하려면 IssueTag repo 주입해서 같이 delete 처리하는 게 좋음.
    // 지금 구조에서 tags가 issueId FK면 아래처럼 QueryBuilder로 지우는 방식 추천.
    await this.issueRepo.manager
      .createQueryBuilder()
      .delete()
      .from('issue_tag') // 실제 테이블명이 다르면 바꿔
      .where('issueId = :id', { id })
      .execute();

    await this.issueRepo.delete(id);

    return { deletedId: id };
  }

  private extractMentions(text: string): string[] {
    const regex = /@(\S+)/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return matches.map((m) => m.substring(1));
  }
}
