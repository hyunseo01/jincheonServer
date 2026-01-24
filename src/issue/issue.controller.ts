import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { IssuesService } from './issue.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('issues')
@UseGuards(JwtAuthGuard) // ✅ 변경
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto, @CurrentUser() user: User) {
    return this.issuesService.create(dto, user);
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
    @CurrentUser() user: User,
  ) {
    return this.issuesService.addComment(id, dto, user);
  }

  @Patch(':id/bump')
  bump(@Param('id') id: string, @CurrentUser() user: User) {
    return this.issuesService.bump(id, user);
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @CurrentUser() user: User) {
    return this.issuesService.toggleStatus(id, user);
  }
}
