import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueTag } from './entities/issue-tag.entity';
import { Issue } from './entities/issue.entity';
import { IssueTimeline } from './entities/issue-timeline.entity';
import { IssuesController } from './issue.controller';
import { IssuesService } from './issue.service';

@Module({
  imports: [TypeOrmModule.forFeature([Issue, IssueTag, IssueTimeline])],
  controllers: [IssuesController],

  providers: [IssuesService],
})
export class IssueModule {}
