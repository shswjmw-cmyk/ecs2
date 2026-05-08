import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common'
import { InterviewService } from './interview.service'
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewController {
  constructor(private interviewService: InterviewService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.interviewService.findAll(req.user.userId)
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.interviewService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateInterviewDto, @Req() req: any) {
    return this.interviewService.create(dto, req.user.userId)
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() dto: UpdateInterviewDto) {
    return this.interviewService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.interviewService.remove(id)
  }
}