import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // 프론트엔드 NewIssueModal에서 categories 배열(["긴급", "배차"])을 보냄
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsString()
  @IsOptional()
  authorId?: string; // 백엔드에서 세션 유저로 덮어쓰겠지만 DTO엔 포함
}
