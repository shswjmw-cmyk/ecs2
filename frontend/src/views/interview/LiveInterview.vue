<template>
  <div class="live-interview">
    <!-- 顶部控制栏 -->
    <div class="control-bar">
      <div class="interview-info">
        <h3>{{ interview?.title }}</h3>
        <el-tag v-if="isRecording" type="danger" effect="dark">录音中</el-tag>
        <el-tag v-else-if="sseState === 'connected'" type="success">已连接</el-tag>
        <el-tag v-else type="info">未开始</el-tag>
        <!-- SSE 连接状态 -->
        <el-tag
          v-if="sseState === 'reconnecting'"
          type="warning"
          size="small"
          effect="dark"
        >
          重连中...
        </el-tag>
        <el-tag
          v-if="sseState === 'disconnected' && isRecording"
          type="danger"
          size="small"
          effect="dark"
        >
          连接断开
        </el-tag>
      </div>
      <div class="controls">
        <el-button v-if="!isRecording" type="danger" @click="startRecording">开始录音</el-button>
        <el-button v-else type="warning" @click="stopRecording" :loading="generatingSummary">
          {{ generatingSummary ? '生成总结中...' : '停止录音' }}
        </el-button>
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>

    <!-- 录音状态 -->
    <div class="track-status">
      <div class="track-item" :class="{ active: micActive }">
        <el-icon><Microphone /></el-icon>
        <span>麦克风</span>
        <el-tag v-if="micActive" type="success" size="small">
          {{ micActive ? '录音中' : '未连接' }}
        </el-tag>
      </div>
      <el-tag type="info" size="small" effect="plain">单音轨模式 - ASR 自动区分说话人</el-tag>
    </div>

    <!-- 主体区域：左60%转写流 + 右40%辅助面板 -->
    <div class="main-content">
      <!-- 左栏：实时转写流 -->
      <div class="transcript-panel">
        <h4>实时转写</h4>
        <div class="transcript-list" ref="transcriptListRef">
          <div
            v-for="item in transcripts"
            :key="item.id"
            class="transcript-item"
            :class="item.speakerRole"
          >
            <div class="speaker-tag">
              <el-tag :type="item.speakerRole === 'interviewer' ? 'primary' : 'success'" size="small">
                {{ item.speaker }}
              </el-tag>
              <span class="timestamp">{{ formatTime(item.startTime) }}</span>
            </div>
            <div class="transcript-text">{{ item.content }}</div>
          </div>
          <div v-if="transcripts.length === 0 && !partialText" class="empty-tip">
            开始录音后，转写内容将实时显示在这里...
          </div>
          <!-- 实时 partial 文本 -->
          <div v-if="partialText" class="transcript-item partial" :class="partialSpeakerRole">
            <div class="speaker-tag">
              <el-tag :type="partialSpeakerRole === 'interviewer' ? 'primary' : 'success'" size="small">
                {{ partialSpeakerRole === 'interviewer' ? '访谈者' : '受访者' }}
              </el-tag>
              <span class="timestamp">识别中...</span>
            </div>
            <div class="transcript-text">{{ partialText }}</div>
          </div>
        </div>
      </div>

      <!-- 右栏：辅助面板 -->
      <div class="assist-panel">
        <!-- 访谈总结（结束后显示） -->
        <div v-if="interviewSummary" class="panel-section summary-final">
          <h4>访谈总结</h4>
          <p class="one-line">{{ interviewSummary.oneLineSummary }}</p>
          <ul class="key-points">
            <li v-for="(point, idx) in interviewSummary.keyPoints" :key="idx">{{ point }}</li>
          </ul>
          <div v-if="interviewSummary.suggestions?.length" class="suggestions">
            <h5>后续建议</h5>
            <ul>
              <li v-for="(s, idx) in interviewSummary.suggestions" :key="idx">{{ s }}</li>
            </ul>
          </div>
        </div>

        <!-- 当前回答摘要 -->
        <div class="panel-section">
          <h4>回答摘要</h4>
          <div v-if="currentSummary" class="summary-content">
            <p class="one-line">{{ currentSummary.oneLineSummary }}</p>
            <ul class="key-points">
              <li v-for="(point, idx) in currentSummary.keyPoints" :key="idx">{{ point }}</li>
            </ul>
          </div>
          <div v-else class="empty-tip">等待受访者回答...</div>
        </div>

        <!-- 追问建议 -->
        <div class="panel-section">
          <h4>追问建议</h4>
          <div v-if="followUpQuestions.length > 0">
            <div v-for="(q, idx) in followUpQuestions" :key="q.id" class="follow-up-item">
              <div class="question-header">
                <el-tag :type="priorityType(q.priority)" size="small">{{ q.priority }}</el-tag>
                <span class="question-text">{{ q.question }}</span>
              </div>
              <div class="question-reason">{{ q.reason }}</div>
              <div class="question-actions">
                <el-button size="small" type="primary" @click="acceptQuestion(q)">采纳</el-button>
                <el-button size="small" @click="skipQuestion(q)">跳过</el-button>
              </div>
            </div>
          </div>
          <div v-else class="empty-tip">AI 将根据对话实时推荐追问...</div>
        </div>

        <!-- 信息缺失提示 -->
        <div class="panel-section">
          <h4>信息缺口</h4>
          <div v-if="gaps.length > 0">
            <el-alert v-for="(gap, idx) in gaps" :key="idx" :title="gap" type="warning" :closable="false" show-icon />
          </div>
          <div v-else class="empty-tip">暂无缺口提示</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInterviewStore } from '../../stores/interview'
import { DualTrackCapture } from '../../utils/audioCapture'
import { transcriptionApi } from '../../api/transcription'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const interviewStore = useInterviewStore()
const interviewId = Number(route.params.id)

const interview = ref(null)
const isRecording = ref(false)
const micActive = ref(false)
const systemActive = ref(false)
const sseState = ref('closed')
const transcripts = ref([])
const partialText = ref('')
const partialSpeakerRole = ref('')
const currentSummary = ref(null)
const followUpQuestions = ref([])
const gaps = ref([])
const transcriptListRef = ref(null)
const interviewSummary = ref(null)
const generatingSummary = ref(false)

let capture = null
let eventSource = null

// --- 音频发送重试 ---
const MAX_RETRY = 3
const RETRY_BASE_DELAY = 1000

async function sendAudioChunk(blob, source, timestamp, retryCount = 0) {
  const formData = new FormData()
  formData.append('audio', blob, `${source}_${timestamp}.pcm`)
  formData.append('audioSource', source)
  formData.append('timestamp', String(timestamp))

  try {
    await transcriptionApi.uploadChunk(interviewId, formData)
  } catch (err) {
    if (retryCount < MAX_RETRY - 1) {
      const delay = RETRY_BASE_DELAY * 2 ** retryCount
      await new Promise((r) => setTimeout(r, delay))
      return sendAudioChunk(blob, source, timestamp, retryCount + 1)
    }
    // 重试用尽，静默丢弃
    console.warn(`[Audio] Chunk upload failed after ${MAX_RETRY} retries`, err?.message)
  }
}

// --- SSE 订阅 ---
function subscribeTranscription() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  eventSource = transcriptionApi.subscribeTranscription(interviewId, {
    onStateChange: (state) => {
      sseState.value = state
      if (state === 'reconnecting') {
        ElMessage.warning('SSE 连接断开，正在重连...')
      } else if (state === 'connected' && retryingAfterDisconnect) {
        ElMessage.success('SSE 连接已恢复')
        retryingAfterDisconnect = false
      }
    },
  })

  let retryingAfterDisconnect = false

  eventSource.addEventListener('partial', (e) => {
    const data = JSON.parse(e.data)
    partialText.value = data.text
    partialSpeakerRole.value = data.speakerRole
    scrollToBottom()
  })

  eventSource.addEventListener('transcript', (e) => {
    const data = JSON.parse(e.data)
    transcripts.value.push(data)
    partialText.value = ''
    partialSpeakerRole.value = ''
    scrollToBottom()
  })

  eventSource.addEventListener('summary', (e) => {
    currentSummary.value = JSON.parse(e.data)
  })

  eventSource.addEventListener('followUp', (e) => {
    const data = JSON.parse(e.data)
    followUpQuestions.value = data
  })

  eventSource.addEventListener('gap', (e) => {
    gaps.value = JSON.parse(e.data)
  })

  eventSource.addEventListener('interviewSummary', (e) => {
    interviewSummary.value = JSON.parse(e.data)
    generatingSummary.value = false
  })

  eventSource.addEventListener('error', (e) => {
    try {
      const data = JSON.parse(e.data)
      ElMessage.error('转写错误：' + (data.message || '未知错误'))
    } catch {
      // SSE error event without parseable data — handled by onStateChange
    }
  })
}

// --- 页面加载时检查是否需要恢复 ---
onMounted(async () => {
  interview.value = await interviewStore.fetchInterviewDetail(interviewId)

  // 如果访谈正在进行中（页面刷新后恢复）
  if (interview.value?.status === 'ongoing') {
    subscribeTranscription()
    isRecording.value = true
    micActive.value = true // 假设录音仍在继续（浏览器端需要重新获取麦克风）

    // 恢复已有转写记录
    try {
      const { data } = await transcriptionApi.getTranscripts?.(interviewId) ||
        (await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/interviews/${interviewId}/transcripts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }).then((r) => r.json()))
      if (Array.isArray(data)) {
        transcripts.value = data
      } else if (Array.isArray(data?.transcripts)) {
        transcripts.value = data.transcripts
      }
    } catch {
      // 获取历史转写失败，不影响继续录音
    }

    ElMessage.info('已恢复访谈连接')
  }
})

onBeforeUnmount(() => {
  stopRecording()
})

async function startRecording() {
  try {
    await transcriptionApi.start(interviewId)
    subscribeTranscription()

    capture = new DualTrackCapture()
    capture.onMicData = async ({ blob, timestamp }) => {
      await sendAudioChunk(blob, 'mixed', timestamp)
    }

    const result = await capture.start({ systemAudio: false })
    micActive.value = result.micActive
    systemActive.value = false
    isRecording.value = true

    ElMessage.success('录音已启动（ASR 自动区分说话人）')
  } catch (err) {
    ElMessage.error('无法启动录音：' + err.message)
  }
}

async function stopRecording() {
  capture?.stop()
  capture = null
  isRecording.value = false
  micActive.value = false
  systemActive.value = false

  // 先关闭 SSE 再调 stop，避免后端 finishStream 后 SSE 写入失败
  // 但我们需要保持 SSE 接收 interviewSummary 事件，所以先调 stop 再关 SSE
  try {
    generatingSummary.value = true
    await transcriptionApi.stop(interviewId)
  } catch {
    generatingSummary.value = false
  }

  // 等待一段时间让 interviewSummary 事件到达，然后关闭 SSE
  setTimeout(() => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
      sseState.value = 'closed'
    }
  }, 5000)
}

function acceptQuestion(q) {
  q.status = 'accepted'
  followUpQuestions.value = followUpQuestions.value.filter((item) => item.id !== q.id)
}

function skipQuestion(q) {
  q.status = 'skipped'
  followUpQuestions.value = followUpQuestions.value.filter((item) => item.id !== q.id)
}

function scrollToBottom() {
  nextTick(() => {
    if (transcriptListRef.value) {
      transcriptListRef.value.scrollTop = transcriptListRef.value.scrollHeight
    }
  })
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function priorityType(p) {
  return p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'info'
}

function goBack() {
  if (isRecording.value) {
    stopRecording()
  }
  router.push('/interviews')
}
</script>

<style scoped>
.live-interview {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  box-sizing: border-box;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.interview-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.interview-info h3 {
  margin: 0;
}

.track-status {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.track-item.active {
  color: #303133;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.transcript-panel {
  width: 60%;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
}

.transcript-panel h4 {
  margin: 0 0 8px;
}

.transcript-list {
  flex: 1;
  overflow-y: auto;
}

.transcript-item {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 6px;
}

.transcript-item.interviewer {
  background: #ecf5ff;
}

.transcript-item.interviewee {
  background: #f0f9eb;
}

.transcript-item.partial {
  opacity: 0.7;
  border-left: 3px solid #409eff;
}

.speaker-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.timestamp {
  font-size: 11px;
  color: #c0c4cc;
}

.transcript-text {
  font-size: 14px;
  line-height: 1.6;
}

.assist-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.panel-section {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
}

.panel-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.summary-final {
  background: #fdf6ec;
  border-color: #e6a23c;
}

.summary-final h4 {
  color: #e6a23c;
}

.summary-content .one-line {
  font-weight: 500;
  margin: 0 0 6px;
}

.key-points {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.8;
}

.suggestions {
  margin-top: 8px;
}

.suggestions h5 {
  margin: 0 0 4px;
  font-size: 13px;
  color: #e6a23c;
}

.suggestions ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.8;
}

.follow-up-item {
  margin-bottom: 10px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.question-text {
  font-weight: 500;
  font-size: 14px;
}

.question-reason {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.question-actions {
  display: flex;
  gap: 8px;
}

.empty-tip {
  color: #c0c4cc;
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}
</style>