import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class BailianService {
  private apiKey: string
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1'

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY')!
  }

  /**
   * 文件转写：传入音频文件 URL，异步获取转写结果
   */
  async createTranscription(fileUrl: string, format = 'wav', sampleRate = 16000) {
    const res = await axios.post(
      `${this.baseUrl}/services/audio/asr/transcription`,
      {
        model: 'sensevoice-v1',
        input: {
          file_urls: [fileUrl],
        },
        parameters: {
          format,
          sample_rate: sampleRate,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    )
    return res.data
  }

  /**
   * 查询转写任务结果
   */
  async getTranscriptionResult(taskId: string) {
    const res = await axios.get(
      `${this.baseUrl}/services/audio/asr/transcription/${taskId}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    )
    return res.data
  }

  /**
   * LLM 调用：通义千问
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number; maxTokens?: number },
  ) {
    const res = await axios.post(
      `${this.baseUrl}/services/aigc/text-generation/generation`,
      {
        model: options?.model || 'qwen-plus',
        input: { messages },
        parameters: {
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          result_format: 'message',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    )
    return res.data
  }

  /**
   * 生成回答摘要
   */
  async generateSummary(
    answer: string,
    researchGoal: string,
    previousAnswers: string[] = [],
  ) {
    const systemPrompt = `你是一个专家访谈助手。你的任务是对受访者的回答生成结构化摘要。
输出格式为 JSON：
{
  "oneLineSummary": "一句话总结",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "categoryTag": "事实|观点|行为证据",
  "relationToGoal": "与研究目标的关联说明",
  "contradictionInfo": "与之前回答的矛盾（如有）"
}
要求：
- keyPoints 2-5 条，简洁明确
- 如果回答中有数据/事实，标记为"事实"；如果是主观判断，标记为"观点"；如果描述了具体行为，标记为"行为证据"
- 识别与之前回答的矛盾之处`

    const userPrompt = `研究目标：${researchGoal}

${previousAnswers.length > 0 ? `之前的回答摘要：\n${previousAnswers.join('\n')}\n` : ''}

当前受访者回答：${answer}

请生成摘要。`

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    try {
      const text = result.output.choices[0].message.content
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { oneLineSummary: text, keyPoints: [] }
    } catch {
      return { oneLineSummary: '摘要生成失败', keyPoints: [] }
    }
  }

  /**
   * 生成追问建议
   */
  async generateFollowUpQuestions(
    answer: string,
    researchGoal: string,
    conversationHistory: string,
  ) {
    const systemPrompt = `你是一个专家访谈助手。根据受访者的回答和研究目标，推荐最多3个追问问题。

追问原则：
1. 直接说原因：当用户提到原因但未详细说明时
2. 追问行为证据：当用户只有观点、没有行为或事实时
3. 量化变化：当用户提到变化但未说清程度时
4. 对比优先级：当用户提到比较/优先级时
5. 澄清模糊概念：当用户使用模糊词汇时
6. 识别矛盾：当回答前后不一致时

输出格式为 JSON 数组：
[
  {
    "question": "追问问题",
    "reason": "推荐理由",
    "priority": "high|medium|low"
  }
]

要求：问题要口语化、简短，像队友直接提醒。紧扣研究目标，不要泛泛而谈。`

    const userPrompt = `研究目标：${researchGoal}

对话历史：
${conversationHistory}

最新回答：${answer}

请推荐追问问题。`

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    try {
      const text = result.output.choices[0].message.content
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      return []
    }
  }

  /**
   * 生成访谈总结（访谈结束后调用）
   */
  async generateInterviewSummary(
    conversationHistory: string,
    researchGoal: string,
    summaries: string[],
  ) {
    const systemPrompt = `你是一个专家访谈助手。访谈已结束，请根据完整对话生成一份总结报告。

输出格式为 JSON：
{
  "oneLineSummary": "一句话概括本次访谈核心发现",
  "keyPoints": ["关键发现1", "关键发现2", ...],
  "suggestions": ["后续行动建议1", "后续行动建议2", ...]
}

要求：
- oneLineSummary：精炼概括，不超过30字
- keyPoints：5-10条，涵盖事实发现、核心观点、行为证据
- suggestions：2-5条，基于信息缺口和研究发现给出后续行动建议
- 如果对话内容太少（少于3轮），仍尽力总结，suggestions 中提示需要补充访谈`

    const userPrompt = `研究目标：${researchGoal}

${summaries.length > 0 ? `各回答摘要：\n${summaries.join('\n')}\n` : ''}

完整对话记录：
${conversationHistory}

请生成访谈总结报告。`

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { maxTokens: 3000 })

    try {
      const text = result.output.choices[0].message.content
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { oneLineSummary: text, keyPoints: [], suggestions: [] }
    } catch {
      return { oneLineSummary: '总结生成失败', keyPoints: [], suggestions: [] }
    }
  }

  /**
   * 信息缺失检测
   */
  async detectGaps(
    conversationHistory: string,
    researchGoal: string,
  ) {
    const systemPrompt = `你是一个专家访谈助手。分析当前访谈是否存在关键信息缺口。

检测维度：
- 关键问题未覆盖
- 回答停留在浅层
- 缺少行为证据
- 缺少具体案例
- 偏离研究目标
- 存在潜在矛盾

输出格式为 JSON 数组，每项是一个缺口描述字符串，最多5条。如果信息完整则返回空数组。`

    const userPrompt = `研究目标：${researchGoal}

对话历史：
${conversationHistory}

请检测信息缺口。`

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    try {
      const text = result.output.choices[0].message.content
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      return []
    }
  }
}