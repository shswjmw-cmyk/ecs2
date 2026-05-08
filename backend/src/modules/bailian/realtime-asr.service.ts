import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import WebSocket from 'ws'
import https from 'https'

// 跳过 SSL 证书验证（仅开发环境）
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

interface AsrCallbacks {
  onPartial: (text: string, speakerRole: 'interviewer' | 'interviewee') => void
  onComplete: (text: string, speakerRole: 'interviewer' | 'interviewee') => void
  onError: (err: Error) => void
}

/**
 * DashScope Paraformer-realtime 流式 ASR 客户端
 * 文档：https://help.aliyun.com/document_detail/2712536.html
 */
@Injectable()
export class RealtimeAsrService implements OnModuleDestroy {
  private apiKey: string
  private wsUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference'

  // 每个 interview 维护一个 WS 连接
  private connections: Map<number, { ws: WebSocket; callbacks: AsrCallbacks }> = new Map()

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY')!
  }

  /**
   * 为指定访谈启动一个流式 ASR 连接
   */
  startStream(interviewId: number, callbacks: AsrCallbacks) {
    if (this.connections.has(interviewId)) {
      return
    }

    const url = `${this.wsUrl}?model=paraformer-realtime-v2&format=pcm&sample_rate=16000&enable_words=true`

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `bearer ${this.apiKey}`,
        'X-DashScope-DataInspection': 'enable',
      },
    })

    ws.on('open', () => {
      console.log(`[ASR] Interview ${interviewId}: WebSocket connected`)
      // 发送开始指令
      this.sendRunTask(ws)
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString())
        this.handleMessage(interviewId, msg, callbacks)
      } catch (err) {
        console.error(`[ASR] Interview ${interviewId}: Parse error`, err)
      }
    })

    ws.on('error', (err) => {
      console.error(`[ASR] Interview ${interviewId}: WS error`, err.message)
      callbacks.onError(err)
    })

    ws.on('close', (code, reason) => {
      console.log(`[ASR] Interview ${interviewId}: WS closed, code=${code}`)
      this.connections.delete(interviewId)
    })

    this.connections.set(interviewId, { ws, callbacks })
  }

  /**
   * 发送音频数据到 ASR
   */
  private audioChunkCount: Map<number, number> = new Map()

  sendAudio(interviewId: number, audioBuffer: Buffer, speakerRole: 'interviewer' | 'interviewee') {
    const conn = this.connections.get(interviewId)
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[ASR] Interview ${interviewId}: Cannot send audio, WS not open (readyState=${conn?.ws.readyState})`)
      return
    }

    conn.ws.send(audioBuffer)
    ;(conn as any).currentSpeakerRole = speakerRole

    const count = (this.audioChunkCount.get(interviewId) || 0) + 1
    this.audioChunkCount.set(interviewId, count)
    if (count <= 3 || count % 10 === 0) {
      console.log(`[ASR] Interview ${interviewId}: Sent chunk #${count}, ${audioBuffer.byteLength} bytes, role=${speakerRole}`)
    }
  }

  /**
   * 结束流式识别
   */
  finishStream(interviewId: number) {
    const conn = this.connections.get(interviewId)
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) return

    // 发送结束指令
    const finishMsg = {
      header: { action: 'finish-task', task_id: `interview_${interviewId}` },
    }
    conn.ws.send(JSON.stringify(finishMsg))
    conn.ws.close()
    this.connections.delete(interviewId)
    this.audioChunkCount.delete(interviewId)
  }

  private sendRunTask(ws: WebSocket) {
    const msg = {
      header: {
        action: 'run-task',
        task_id: `task_${Date.now()}`,
        streaming: 'duplex',
      },
      payload: {
        model: 'paraformer-realtime-v2',
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        parameters: {
          sample_rate: 16000,
          format: 'pcm',
          enable_words: true,
          // 启用说话人分离功能（单音轨模式下区分访谈者/受访者）
          enable_speaker_words: true,
          // 说话人数量（2 = 访谈者 + 受访者）
          speaker_count: 2,
        },
        input: {},
      },
    }
    ws.send(JSON.stringify(msg))
  }

  private handleMessage(interviewId: number, msg: any, callbacks: AsrCallbacks) {
    const event = msg.header?.event

    if (event === 'task-started') {
      console.log(`[ASR] Interview ${interviewId}: Task started`)
      return
    }

    if (event === 'result-generated') {
      const sentence = msg.payload?.output?.sentence
      if (!sentence) return

      const text = sentence.text
      if (!text) return

      const isFinal = sentence.end_time > 0

      // 从 ASR 结果中获取说话人 ID（enable_speaker_words 启用后返回）
      let speakerRole: 'interviewer' | 'interviewee' = 'interviewee'

      if (sentence.speaker_id !== undefined) {
        // 说话人分离模式：speaker_id = 0 或 1
        // 约定：speaker_id = 0 → 访谈者，speaker_id = 1 → 受访者
        speakerRole = sentence.speaker_id === 0 ? 'interviewer' : 'interviewee'
        console.log(`[ASR] Interview ${interviewId}: ${isFinal ? 'COMPLETE' : 'PARTIAL'} [Speaker ${sentence.speaker_id} → ${speakerRole}] "${text}"`)
      } else {
        // 降级：使用之前缓存的 speakerRole（双音轨模式）
        const conn = this.connections.get(interviewId)
        speakerRole = (conn as any)?.currentSpeakerRole || 'interviewee'
        console.log(`[ASR] Interview ${interviewId}: ${isFinal ? 'COMPLETE' : 'PARTIAL'} [${speakerRole}] "${text}"`)
      }

      if (isFinal) {
        callbacks.onComplete(text, speakerRole)
      } else {
        callbacks.onPartial(text, speakerRole)
      }
      return
    }

    if (event === 'task-finished') {
      console.log(`[ASR] Interview ${interviewId}: Task finished`)
      return
    }

    if (event === 'task-failed') {
      const errMsg = msg.payload?.message || 'Unknown error'
      console.error(`[ASR] Interview ${interviewId}: Task failed - ${errMsg}`)
      callbacks.onError(new Error(errMsg))
      return
    }
  }

  onModuleDestroy() {
    for (const [interviewId, conn] of this.connections) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close()
      }
    }
    this.connections.clear()
  }
}