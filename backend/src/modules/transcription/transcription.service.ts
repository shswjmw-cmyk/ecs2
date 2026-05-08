import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Transcript } from '../interview/entities/transcript.entity'
import { Summary } from '../interview/entities/summary.entity'
import { FollowUpQuestion } from '../interview/entities/follow-up-question.entity'
import { Interview } from '../interview/entities/interview.entity'

@Injectable()
export class TranscriptionService {
  constructor(
    @InjectRepository(Transcript)
    private transcriptRepo: Repository<Transcript>,
    @InjectRepository(Summary)
    private summaryRepo: Repository<Summary>,
    @InjectRepository(FollowUpQuestion)
    private followUpRepo: Repository<FollowUpQuestion>,
    @InjectRepository(Interview)
    private interviewRepo: Repository<Interview>,
  ) {}

  async saveTranscript(
    interviewId: number,
    content: string,
    speaker: string,
    speakerRole: 'interviewer' | 'interviewee',
    audioSource: 'mic' | 'system',
    startTime: number,
    endTime?: number,
  ) {
    const transcript = this.transcriptRepo.create({
      interviewId,
      content,
      speaker,
      speakerRole,
      audioSource,
      startTime,
      endTime,
    })
    return this.transcriptRepo.save(transcript)
  }

  async getTranscripts(interviewId: number) {
    return this.transcriptRepo.find({
      where: { interviewId },
      order: { startTime: 'ASC' },
    })
  }

  async saveSummary(
    interviewId: number,
    oneLineSummary: string,
    keyPoints: string[],
    categoryTag?: string,
    relationToGoal?: string,
    contradictionInfo?: string,
  ) {
    const summary = this.summaryRepo.create({
      interviewId,
      oneLineSummary,
      keyPoints,
      categoryTag,
      relationToGoal,
      contradictionInfo,
      transcriptSegmentStart: 0,
    })
    return this.summaryRepo.save(summary)
  }

  async getSummaries(interviewId: number) {
    return this.summaryRepo.find({
      where: { interviewId },
      order: { createdAt: 'ASC' },
    })
  }

  async saveFollowUpQuestion(
    interviewId: number,
    question: string,
    reason: string,
    priority: 'high' | 'medium' | 'low',
  ) {
    const fq = this.followUpRepo.create({
      interviewId,
      question,
      reason,
      priority,
    })
    return this.followUpRepo.save(fq)
  }

  async getInterview(interviewId: number) {
    return this.interviewRepo.findOne({ where: { id: interviewId } })
  }

  async updateInterviewStatus(interviewId: number, status: 'draft' | 'ongoing' | 'completed') {
    await this.interviewRepo.update(interviewId, { status })
  }
}