import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'

export class CreateInterviewDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  researchGoal: string

  @IsNumber()
  projectId: number

  @IsString()
  @IsOptional()
  intervieweeInfo?: string
}

export class UpdateInterviewDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  researchGoal?: string

  @IsString()
  @IsOptional()
  status?: 'draft' | 'ongoing' | 'completed'

  @IsString()
  @IsOptional()
  finalSummary?: string
}