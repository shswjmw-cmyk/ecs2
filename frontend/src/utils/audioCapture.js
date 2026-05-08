/**
 * 音频采集器（原始 PCM 输出）
 * 采集 16-bit PCM @ 16kHz 单声道，直接供 DashScope Paraformer 使用
 *
 * MVP 模式：单音轨混合采集（麦克风 + 系统音频混合）
 * - 依赖 ASR 的说话人分离功能区分访谈者/受访者
 *
 * 未来扩展：可启用双音轨模式，分别采集麦克风（访谈者）和系统音频（受访者）
 */

export class DualTrackCapture {
  constructor() {
    this.audioContext = null
    this.micStream = null
    this.systemStream = null
    this.micProcessor = null
    this.systemProcessor = null
    this.silentGain = null
    this.onMicData = null
    this.onSystemData = null
    this.micPcmBuffers = []
    this.systemPcmBuffers = []
    this.chunkInterval = 2000
    this.chunkTimer = null
    this.isRecording = false
    this.targetSampleRate = 16000
  }

  /**
 * 启动音频采集
 * @param {Object} options - 配置选项
 * @param {boolean} options.systemAudio - 是否尝试采集系统音频（默认 false，单音轨模式）
 */
async start(options = {}) {
    const { systemAudio = false } = options

    try {
      this.audioContext = new AudioContext()
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const nativeSampleRate = this.audioContext.sampleRate
      const ratio = nativeSampleRate / this.targetSampleRate

      // 静音输出节点，避免声音从扬声器播出
      this.silentGain = this.audioContext.createGain()
      this.silentGain.gain.value = 0
      this.silentGain.connect(this.audioContext.destination)

      // Track 1: 麦克风（访谈者）- 必须采集
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const micSource = this.audioContext.createMediaStreamSource(this.micStream)
      this.micProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
      this.micProcessor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0)
        const downsampled = this._downsample(float32, ratio)
        const pcm = this._float32ToInt16(downsampled)
        this.micPcmBuffers.push(pcm)
      }
      micSource.connect(this.micProcessor)
      this.micProcessor.connect(this.silentGain)

      // Track 2: 系统声卡（受访者）- 可选，MVP 模式默认关闭
      let systemActive = false
      if (systemAudio) {
        try {
          if (!navigator.mediaDevices.getDisplayMedia) {
            console.warn('[DualTrackCapture] getDisplayMedia not supported')
          } else {
            this.systemStream = await navigator.mediaDevices.getDisplayMedia({
              video: false,
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
              preferCurrentTab: true,
            })

            const audioTracks = this.systemStream.getAudioTracks()
            console.log('[DualTrackCapture] System audio tracks:', audioTracks.length)

            if (audioTracks.length === 0) {
              console.warn('[DualTrackCapture] No audio tracks in system stream')
              this.systemStream.getTracks().forEach(t => t.stop())
              this.systemStream = null
            } else {
              const systemSource = this.audioContext.createMediaStreamSource(this.systemStream)
              this.systemProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
              this.systemProcessor.onaudioprocess = (e) => {
                const float32 = e.inputBuffer.getChannelData(0)
                const downsampled = this._downsample(float32, ratio)
                const pcm = this._float32ToInt16(downsampled)
                this.systemPcmBuffers.push(pcm)
              }
              systemSource.connect(this.systemProcessor)
              this.systemProcessor.connect(this.silentGain)
              systemActive = true

              audioTracks[0].addEventListener('ended', () => {
                console.log('[DualTrackCapture] System audio track ended')
                systemActive = false
              })
            }
          }
        } catch (err) {
          console.warn('[DualTrackCapture] System audio authorization failed:', err.name, err.message)
        }
      }

      // 定时发送累积的 PCM 数据
      this.chunkTimer = setInterval(() => {
        this._flushBuffers()
      }, this.chunkInterval)

      this.isRecording = true
      return {
        micActive: true,
        systemActive,
        fallback: !systemActive,
      }
    } catch (err) {
      console.error('[DualTrackCapture] Start error:', err)
      throw err
    }
  }

  _flushBuffers() {
    if (this.micPcmBuffers.length > 0 && this.onMicData) {
      const combined = this._combineBuffers(this.micPcmBuffers)
      const blob = new Blob([combined], { type: 'audio/pcm' })
      this.onMicData({ blob, source: 'mic', timestamp: Date.now() })
      this.micPcmBuffers = []
    }
    if (this.systemPcmBuffers.length > 0 && this.onSystemData) {
      const combined = this._combineBuffers(this.systemPcmBuffers)
      const blob = new Blob([combined], { type: 'audio/pcm' })
      this.onSystemData({ blob, source: 'system', timestamp: Date.now() })
      this.systemPcmBuffers = []
    }
  }

  _downsample(buffer, ratio) {
    const newLength = Math.round(buffer.length / ratio)
    const result = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
      const idx = i * ratio
      const low = Math.floor(idx)
      const high = Math.min(low + 1, buffer.length - 1)
      const frac = idx - low
      result[i] = buffer[low] * (1 - frac) + buffer[high] * frac
    }
    return result
  }

  _float32ToInt16(float32) {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16.buffer
  }

  _combineBuffers(buffers) {
    let totalLength = 0
    for (const buf of buffers) totalLength += buf.byteLength
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
      combined.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }
    return combined.buffer
  }

  stop() {
    this.isRecording = false
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer)
      this.chunkTimer = null
    }
    this._flushBuffers()

    this.micProcessor?.disconnect()
    this.systemProcessor?.disconnect()
    this.silentGain?.disconnect()

    this.micStream?.getTracks().forEach((t) => t.stop())
    this.systemStream?.getTracks().forEach((t) => t.stop())
    this.audioContext?.close()

    this.micStream = null
    this.systemStream = null
    this.micProcessor = null
    this.systemProcessor = null
    this.silentGain = null
    this.audioContext = null
    this.micPcmBuffers = []
    this.systemPcmBuffers = []
  }

  getMicLevel() {
    if (!this.micStream) return 0
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    const source = ctx.createMediaStreamSource(this.micStream)
    source.connect(analyser)
    analyser.fftSize = 256
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    ctx.close()
    return avg
  }
}