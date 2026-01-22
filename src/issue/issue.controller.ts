import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Session,
} from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { User } from '../auth/entities/user.entity';
import { IssuesService } from './issue.service';

@Controller('issues')
@UseGuards(AuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto, @Session() session: { user: User }) {
    return this.issuesService.create(dto, session.user);
  }

  @Get()
  findAll() {
    return this.issuesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Session() session: { user: User },
  ) {
    return this.issuesService.addComment(id, dto, session.user);
  }

  @Patch(':id/bump')
  bump(@Param('id') id: string, @Session() session: { user: User }) {
    return this.issuesService.bump(id, session.user);
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Session() session: { user: User }) {
    return this.issuesService.toggleStatus(id, session.user);
  }
}
