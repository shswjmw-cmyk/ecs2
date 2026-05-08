import request from './request'

/**
 * 可重连的 EventSource 封装
 * - 指数退避重连（1s → 2s → 4s，上限 30s）
 * - 连接状态回调
 * - 手动关闭时不自动重连
 */
export class ResilientEventSource {
  constructor(url, options = {}) {
    this.url = url
    this.maxRetries = options.maxRetries ?? Infinity
    this.baseDelay = options.baseDelay ?? 1000
    this.maxDelay = options.maxDelay ?? 30000
    this.onStateChange = options.onStateChange ?? (() => {})

    this.es = null
    this.retryCount = 0
    this.retryTimer = null
    this.closed = false
    this.listeners = new Map()
    this.connect()
  }

  connect() {
    if (this.closed) return

    this.onStateChange(this.retryCount === 0 ? 'connecting' : 'reconnecting')
    this.es = new EventSource(this.url)

    this.es.onopen = () => {
      this.retryCount = 0
      this.onStateChange('connected')
    }

    this.es.onerror = () => {
      if (this.closed) return
      this.es.close()
      this.es = null
      this.onStateChange('disconnected')

      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(this.baseDelay * 2 ** this.retryCount, this.maxDelay)
        this.retryCount++
        this.retryTimer = setTimeout(() => this.connect(), delay)
      }
    }

    // 重新绑定已有的事件监听
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.es.addEventListener(event, handler)
      }
    }
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(handler)
    this.es?.addEventListener(event, handler)
  }

  removeEventListener(event, handler) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx !== -1) handlers.splice(idx, 1)
    }
    this.es?.removeEventListener(event, handler)
  }

  close() {
    this.closed = true
    clearTimeout(this.retryTimer)
    this.es?.close()
    this.es = null
    this.listeners.clear()
    this.onStateChange('closed')
  }

  get state() {
    if (this.closed) return 'closed'
    if (!this.es) return 'disconnected'
    switch (this.es.readyState) {
      case EventSource.CONNECTING: return this.retryCount > 0 ? 'reconnecting' : 'connecting'
      case EventSource.OPEN: return 'connected'
      case EventSource.CLOSED: return 'disconnected'
      default: return 'unknown'
    }
  }
}

export const transcriptionApi = {
  start: (interviewId) => request.post(`/interviews/${interviewId}/start`),

  uploadChunk: (interviewId, formData) =>
    request.post(`/interviews/${interviewId}/transcribe`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  stop: (interviewId) => request.post(`/interviews/${interviewId}/stop`),

  subscribeTranscription: (interviewId, options = {}) => {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/interviews/${interviewId}/transcription/stream?token=${token}`
    return new ResilientEventSource(url, options)
  },
}