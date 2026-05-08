import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InterviewService } from './interview.service'
import { InterviewController } from './interview.controller'
import { Interview } from './entities/interview.entity'
import { Transcript } from './entities/transcript.entity'
import { Summary } from './entities/summary.entity'
import { FollowUpQuestion } from './entities/follow-up-question.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Interview, Transcript, Summary, FollowUpQuestion])],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}