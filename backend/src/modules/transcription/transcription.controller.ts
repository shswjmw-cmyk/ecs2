import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { TranscriptionService } from './transcription.service'
import { UploadChunkDto } from './dto/transcription.dto'
import { BailianService } from '../bailian/bailian.service'
import { RealtimeAsrService } from '../bailian/realtime-asr.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class TranscriptionController {
  private sseClients: Map<number, Response[]> = new Map()
  // 缓存每个 interview 的 partial text，用于拼接
  private partialTexts: Map<number, string> = new Map()

  constructor(
    private transcriptionService: TranscriptionService,
    private bailianService: BailianService,
    private realtimeAsrService: RealtimeAsrService,
  ) {}

  /**
   * 开始访谈录音，建立 ASR WebSocket 连接
   */
  @Post(':id/start')
  async startInterview(@Param('id') interviewId: number) {
    // 更新访谈状态为进行中
    await this.transcriptionService.updateInterviewStatus(interviewId, 'ongoing')

    // 启动流式 ASR
    this.realtimeAsrService.startStream(interviewId, {
      onPartial: (text, speakerRole) => {
        this.partialTexts.set(interviewId, text)
        this.sendSSE(interviewId, 'partial', { text, speakerRole })
      },
      onComplete: async (text, speakerRole) => {
        this.partialTexts.delete(interviewId)
        const speaker = speakerRole === 'interviewer' ? '访谈者' : '受访者'
        const startTime = Date.now() / 1000

        // 保存完整转写
        const transcript = await this.transcriptionService.saveTranscript(
          interviewId,
          text,
          speaker,
          speakerRole,
          speakerRole === 'interviewer' ? 'mic' : 'system',
          startTime,
        )

        this.sendSSE(interviewId, 'transcript', transcript)

        // 受访者回答触发 AI 分析
        if (speakerRole === 'interviewee') {
          this.processAIResponse(interviewId, text).catch(console.error)
        }
      },
      onError: (err) => {
        this.sendSSE(interviewId, 'error', { message: err.message })
      },
    })

    return { interviewId, status: 'ongoing', asrConnected: true }
  }

  /**
   * 接收前端音频片段，转发到 ASR WebSocket
   */
  @Post(':id/transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadChunk(
    @Param('id') interviewId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadChunkDto,
  ) {
    // 单音轨混合模式（mixed）下，传 'interviewee' 作为默认值，实际说话人由 ASR 区分
    const speakerRole: 'interviewer' | 'interviewee' =
      dto.audioSource === 'mic' ? 'interviewer' : 'interviewee'

    // 将音频转发到 ASR WebSocket
    if (file?.buffer) {
      this.realtimeAsrService.sendAudio(interviewId, file.buffer, speakerRole)
    }

    return { received: true, audioSource: dto.audioSource }
  }

  /**
   * 停止访谈录音
   */
  @Post(':id/stop')
  async stopInterview(@Param('id') interviewId: number) {
    this.realtimeAsrService.finishStream(interviewId)
    await this.transcriptionService.updateInterviewStatus(interviewId, 'completed')

    // 异步生成访谈总结并通过 SSE 推送
    this.generateInterviewSummary(interviewId).catch((err) => {
      console.error(`[Interview ${interviewId}] Summary generation failed:`, err.message)
    })

    return { interviewId, status: 'completed' }
  }

  /**
   * SSE 推送流：转写结果、摘要、追问、缺口
   */
  @Get(':id/transcription/stream')
  async streamTranscription(@Param('id') interviewId: number, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    if (!this.sseClients.has(interviewId)) {
      this.sseClients.set(interviewId, [])
    }
    this.sseClients.get(interviewId)!.push(res)

    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n')
    }, 15000)

    res.on('close', () => {
      clearInterval(heartbeat)
      const clients = this.sseClients.get(interviewId) || []
      this.sseClients.set(
        interviewId,
        clients.filter((c) => c !== res),
      )
    })
  }

  /**
   * 获取访谈转写记录
   */
  @Get(':id/transcripts')
  async getTranscripts(@Param('id') interviewId: number) {
    return this.transcriptionService.getTranscripts(interviewId)
  }

  // --- Private methods ---

  private async processAIResponse(interviewId: number, answer: string) {
    const interview = await this.transcriptionService.getInterview(interviewId)
    if (!interview) return

    const researchGoal = interview.researchGoal
    const previousSummaries = await this.transcriptionService.getSummaries(interviewId)
    const prevTexts = previousSummaries.map((s) => s.oneLineSummary)
    const context = await this.buildConversationContext(interviewId)

    const [summary, followUps, gaps] = await Promise.all([
      this.bailianService.generateSummary(answer, researchGoal, prevTexts),
      this.bailianService.generateFollowUpQuestions(answer, researchGoal, context),
      this.bailianService.detectGaps(context, researchGoal),
    ])

    const savedSummary = await this.transcriptionService.saveSummary(
      interviewId,
      summary.oneLineSummary,
      summary.keyPoints,
      summary.categoryTag,
      summary.relationToGoal,
      summary.contradictionInfo,
    )
    this.sendSSE(interviewId, 'summary', savedSummary)

    const savedFollowUps: any[] = []
    for (const fq of followUps.slice(0, 3)) {
      const saved = await this.transcriptionService.saveFollowUpQuestion(
        interviewId,
        fq.question,
        fq.reason,
        fq.priority,
      )
      savedFollowUps.push(saved)
    }
    this.sendSSE(interviewId, 'followUp', savedFollowUps)

    this.sendSSE(interviewId, 'gap', gaps)
  }

  private async buildConversationContext(interviewId: number): Promise<string> {
    const transcripts = await this.transcriptionService.getTranscripts(interviewId)
    return transcripts.map((t) => `${t.speaker}：${t.content}`).join('\n')
  }

  private async generateInterviewSummary(interviewId: number) {
    const interview = await this.transcriptionService.getInterview(interviewId)
    if (!interview) return

    const context = await this.buildConversationContext(interviewId)
    if (!context.trim()) return

    const summaries = await this.transcriptionService.getSummaries(interviewId)
    const summaryTexts = summaries.map((s) => s.oneLineSummary)

    const result = await this.bailianService.generateInterviewSummary(
      context,
      interview.researchGoal,
      summaryTexts,
    )

    this.sendSSE(interviewId, 'interviewSummary', result)
  }

  private sendSSE(interviewId: number, event: string, data: any) {
    const clients = this.sseClients.get(interviewId) || []
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    clients.forEach((res) => {
      try {
        res.write(payload)
      } catch {
        // client disconnected
      }
    })
  }
}