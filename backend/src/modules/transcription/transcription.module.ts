import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TranscriptionService } from './transcription.service'
import { TranscriptionController } from './transcription.controller'
import { Transcript } from '../interview/entities/transcript.entity'
import { Summary } from '../interview/entities/summary.entity'
import { FollowUpQuestion } from '../interview/entities/follow-up-question.entity'
import { Interview } from '../interview/entities/interview.entity'
import { BailianModule } from '../bailian/bailian.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Transcript, Summary, FollowUpQuestion, Interview]),
    BailianModule,
  ],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}