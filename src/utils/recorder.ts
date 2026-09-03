/**
 * 마이크 녹음입니다. 화면은 "지금 녹음 중인가", "말이 시작됐나", 소리 크기만 알면 됩니다.
 *
 * `MediaRecorder`를 쓰지 않습니다. 서버 STT에 보내는 형식이 **16kHz 모노 WAV**인데
 * `MediaRecorder`는 어느 브라우저에서도 WAV를 내주지 않습니다(Chrome은 webm/opus, Safari는
 * mp4/aac). 그래서 소리를 원본(PCM)으로 직접 받아 `wav.ts`에서 조립합니다. 마침 그 원본이 손에
 * 있으니 **소리 크기로 말이 끝났는지**도 여기서 함께 봅니다 — 어르신이 "이제 그만"을 누르려고
 * 버튼을 다시 찾지 않아도 되도록.
 *
 * 재생(TTS)은 여기 없습니다. `speaker.ts`가 들고 있고, 녹음이 시작될 때 그쪽을 멈춥니다 —
 * 마이크가 열려 있을 때 스피커가 울리면 도담의 목소리를 그대로 받아 적게 됩니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { TARGET_SAMPLE_RATE, WAV_MIME_TYPE, encodeWav, rms } from './wav'

/**
 * 녹음 상한입니다. 서버가 한 번에 받는 크기(8MB)에는 한참 못 미치지만, 계속 이야기하시더라도
 * 대화가 언젠가는 굴러가게 하는 쪽이 중요합니다. 16kHz 16bit면 60초가 약 1.9MB입니다.
 *
 * kindy(아이들 대화)의 20초보다 깁니다. 어르신의 회상은 20초에 끝나지 않습니다.
 */
const MAX_SECONDS = 60

/**
 * 말이 끊긴 뒤 이만큼 조용하면 스스로 끝냅니다.
 *
 * 2초입니다. 어르신은 문장 사이에서 자주, 그리고 길게 쉬십니다 — 여기를 1초쯤으로 줄이면
 * 생각하시는 동안 녹음이 끝나 버려서 말이 반 토막 난 채로 전송됩니다.
 */
const SILENCE_HOLD_MS = 2000

/** 이만큼 이어져야 "말했다"로 봅니다. 문 닫는 소리 한 번에 녹음이 끝나지 않게. */
const SPEECH_HOLD_MS = 200

/** 한 마디도 없이 이 시간이 지나면 접습니다. 마이크를 켜 둔 채 잊어버린 경우입니다. */
const NO_SPEECH_TIMEOUT_MS = 10000

/** 시작 직후 이 동안의 소리를 "그 방의 조용함"으로 잡습니다. */
const CALIBRATE_MS = 400

/** 조용함보다 이 배 이상 커야 말로 봅니다. */
const FLOOR_MULTIPLIER = 2.2

/** 아주 조용한 방에서 문턱이 0에 붙어 숨소리까지 말이 되는 걸 막는 바닥값입니다. */
const MIN_THRESHOLD = 0.012

/** 한 번에 받아 오는 표본 수. 16kHz에서 약 64ms — 파형도 판단도 이 주기로 갱신됩니다. */
const CHUNK_SAMPLES = 1024

/**
 * 오디오 스레드에서 도는 코드입니다. 문자열인 이유는 `AudioWorklet`이 **별도 모듈 파일의 URL**만
 * 받기 때문입니다. 번들러에 파일을 하나 더 얹는 대신 Blob URL로 싣습니다.
 *
 * 하는 일은 표본을 모아 한 덩어리씩 넘기는 것뿐입니다. 128표본마다 오는 콜백을 그대로 메인
 * 스레드로 흘리면 React가 초당 125번 다시 그립니다.
 */
const CAPTURE_WORKLET = `
class DamsoCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    this.pending.push(new Float32Array(channel));
    this.filled += channel.length;
    if (this.filled >= ${CHUNK_SAMPLES}) {
      const merged = new Float32Array(this.filled);
      let offset = 0;
      for (const chunk of this.pending) { merged.set(chunk, offset); offset += chunk.length; }
      this.pending = [];
      this.filled = 0;
      this.port.postMessage(merged, [merged.buffer]);
    }
    return true;
  }
}
registerProcessor("damso-capture", DamsoCapture);
`

/**
 * 마이크를 쓸 수 있는 환경인지.
 *
 * `getUserMedia`는 **보안 컨텍스트(HTTPS 또는 localhost)에서만** 정의됩니다. 휴대폰에서
 * `http://192.168.x.x:5173` 같은 LAN 주소로 열면 `undefined`라 그냥 부르면 터집니다.
 */
export function canRecordAudio(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

export type Recording = {
  blob: Blob
  mimeType: string
}

export function useVoiceRecorder(options: { onStart?: () => void; onDenied?: () => void } = {}) {
  const [recording, setRecording] = useState(false)
  /** 0~1. 파형 막대의 높이입니다. */
  const [level, setLevel] = useState(0)
  /** 실제로 말이 시작됐는지. 화면의 안내 문구가 이걸 봅니다. */
  const [heard, setHeard] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(MAX_SECONDS)
  const [denied, setDenied] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const disconnectRef = useRef<(() => void) | null>(null)
  const workletUrlRef = useRef<string | null>(null)
  const resolveRef = useRef<((value: Recording | null) => void) | null>(null)

  /** 녹음 한 번 동안의 상태입니다. 조각이 올 때마다 갱신되므로 state가 아니라 ref입니다. */
  const takeRef = useRef({
    chunks: [] as Float32Array[],
    sampleRate: TARGET_SAMPLE_RATE,
    samples: 0,
    speechMs: 0,
    silenceMs: 0,
    heard: false,
    floor: 0,
    floorSamples: 0,
    floorCount: 0,
    closed: false,
  })

  const { onStart, onDenied } = options

  /** 마이크·오디오 그래프를 전부 놓습니다. 트랙을 멈추지 않으면 마이크 표시등이 계속 켜져 있습니다. */
  const teardown = useCallback(() => {
    disconnectRef.current?.()
    disconnectRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void contextRef.current?.close().catch(() => undefined)
    contextRef.current = null
    if (workletUrlRef.current) {
      URL.revokeObjectURL(workletUrlRef.current)
      workletUrlRef.current = null
    }
    setLevel(0)
    setHeard(false)
    setRecording(false)
  }, [])

  useEffect(() => teardown, [teardown])

  /**
   * 녹음을 닫고 결과를 돌려줍니다.
   *
   * `spoke`가 false면 아무 말도 없었던 것이라 `null`입니다. 다만 버튼을 눌러 직접 끝내셨다면,
   * 문턱을 못 넘을 만큼 작게 말했더라도 있는 소리를 그대로 보냅니다 — 여기서 버리면 말한 것이
   * 통째로 사라진 것으로 보입니다.
   */
  const finish = useCallback(
    (spoke: boolean) => {
      const take = takeRef.current
      if (take.closed) return
      take.closed = true

      const chunks = take.chunks
      const sampleRate = take.sampleRate
      take.chunks = []
      teardown()

      const resolve = resolveRef.current
      resolveRef.current = null
      if (!resolve) return

      if (!spoke || chunks.length === 0) {
        resolve(null)
        return
      }

      const blob = encodeWav(chunks, sampleRate)
      // 44바이트는 헤더만 있고 소리가 없다는 뜻입니다.
      resolve(blob.size > 44 ? { blob, mimeType: WAV_MIME_TYPE } : null)
    },
    [teardown],
  )

  /** 버튼을 눌러 직접 끝내는 길입니다. */
  const stop = useCallback(() => finish(true), [finish])

  /**
   * 조각 하나가 도착할 때마다 부릅니다. 파형, 말의 시작/끝, 상한 — 시간과 관련된 판단은 전부
   * 여기서 **표본 수**로 셉니다. `setInterval`은 탭이 뒤로 가면 느려지지만 오디오 스레드는 계속
   * 돌기 때문에, 시계보다 표본이 정확합니다.
   */
  const consume = useCallback(
    (samples: Float32Array) => {
      const take = takeRef.current
      if (take.closed) return

      take.chunks.push(samples)
      take.samples += samples.length
      const chunkMs = (samples.length / take.sampleRate) * 1000
      const elapsedMs = (take.samples / take.sampleRate) * 1000

      const loudness = rms(samples)
      // RMS는 파형의 봉우리보다 훨씬 작습니다. 막대가 늘 바닥에 붙어 보이지 않게 키웁니다.
      setLevel(Math.min(1, loudness * 5))
      setSecondsLeft(Math.max(0, MAX_SECONDS - Math.floor(elapsedMs / 1000)))

      // 처음 얼마간은 그 방이 얼마나 조용한지부터 재고, 그 뒤로도 조용한 순간마다 아주 천천히
      // 따라갑니다(에어컨이 도중에 켜져도 문턱이 따라 올라갑니다).
      if (take.floorSamples < (CALIBRATE_MS / 1000) * take.sampleRate) {
        take.floorSamples += samples.length
        take.floorCount += 1
        take.floor += (loudness - take.floor) / take.floorCount
        return
      }

      const threshold = Math.max(MIN_THRESHOLD, take.floor * FLOOR_MULTIPLIER)

      if (loudness > threshold) {
        take.silenceMs = 0
        take.speechMs += chunkMs
        if (!take.heard && take.speechMs >= SPEECH_HOLD_MS) {
          take.heard = true
          setHeard(true)
        }
      } else {
        take.floor += (loudness - take.floor) * 0.05
        take.speechMs = 0
        if (take.heard) {
          take.silenceMs += chunkMs
          // 말이 끝났습니다. 버튼을 다시 찾을 필요 없이 여기서 보냅니다.
          if (take.silenceMs >= SILENCE_HOLD_MS) {
            finish(true)
            return
          }
        }
      }

      if (!take.heard && elapsedMs >= NO_SPEECH_TIMEOUT_MS) {
        finish(false)
        return
      }
      if (elapsedMs >= MAX_SECONDS * 1000) finish(true)
    },
    [finish],
  )

  /**
   * 마이크를 오디오 그래프에 붙입니다. `AudioWorklet`이 먼저입니다 — 오디오 전용 스레드에서 돌기
   * 때문에 화면이 바쁠 때도 표본을 놓치지 않습니다. 실패하면(모듈 로딩을 막는 CSP 등) 낡은
   * `ScriptProcessorNode`로 물러섭니다. 조용히 녹음이 안 되는 것보다는 낫습니다.
   */
  const attach = useCallback(
    async (context: AudioContext, source: MediaStreamAudioSourceNode) => {
      // 출력을 어딘가에 연결해야 그래프가 돌아갑니다. 볼륨 0이라 소리는 나지 않습니다
      // (그냥 destination에 붙이면 어르신의 목소리가 스피커로 되돌아 나옵니다).
      const sink = context.createGain()
      sink.gain.value = 0
      sink.connect(context.destination)

      try {
        const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }))
        workletUrlRef.current = url
        await context.audioWorklet.addModule(url)
        const node = new AudioWorkletNode(context, 'damso-capture')
        node.port.onmessage = (event: MessageEvent<Float32Array>) => consume(event.data)
        source.connect(node)
        node.connect(sink)
        disconnectRef.current = () => {
          node.port.onmessage = null
          node.disconnect()
          source.disconnect()
          sink.disconnect()
        }
        return
      } catch (cause) {
        console.warn('[damso] AudioWorklet을 쓸 수 없어 예전 방식으로 녹음합니다.', cause)
      }

      const processor = context.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (event) =>
        consume(new Float32Array(event.inputBuffer.getChannelData(0)))
      source.connect(processor)
      processor.connect(sink)
      disconnectRef.current = () => {
        processor.onaudioprocess = null
        processor.disconnect()
        source.disconnect()
        sink.disconnect()
      }
    },
    [consume],
  )

  /**
   * 녹음을 시작하고, 끝났을 때의 결과를 약속으로 돌려줍니다.
   *
   * 끝나는 길은 셋입니다: 말을 멈췄거나(대부분), 버튼을 다시 눌렀거나, 상한에 닿았거나.
   * 어느 쪽이든 이 약속 하나가 풀립니다. 실패하거나 아무 말도 없었으면 `null`입니다.
   */
  const start = useCallback(async (): Promise<Recording | null> => {
    if (contextRef.current) return null
    if (!canRecordAudio()) return null

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          // 스피커로 나간 도담의 목소리가 마이크로 되돌아오는 것과 방 잡음을 브라우저가 먼저
          // 걷어 줍니다. 아래의 소리 크기 판단이 그만큼 쉬워집니다.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (cause) {
      console.warn('[damso] 마이크를 쓸 수 없습니다.', cause)
      setDenied(true)
      // state가 아니라 콜백으로도 알립니다. start()를 기다리던 쪽에서는 위 setDenied가 아직
      // 보이지 않습니다(그 closure는 이번 렌더의 값을 들고 있습니다) — "마이크를 막았다"와
      // "아무 말도 없었다"를 그쪽에서 갈라 말하려면 이 신호가 필요합니다.
      onDenied?.()
      return null
    }

    onStart?.()
    streamRef.current = stream
    setDenied(false)
    setHeard(false)
    setSecondsLeft(MAX_SECONDS)

    /**
     * 16kHz로 열어 달라고 청합니다. 들어주는 브라우저에서는 변환이 아예 필요 없습니다.
     *
     * 다만 **마이크의 표본율과 다른 컨텍스트에 스트림을 붙이는 것을 거부**하는 브라우저가
     * 있었습니다. 그래서 스트림을 붙여 보는 데까지가 한 묶음이고, 실패하면 기기 표본율 그대로
     * 다시 열어 `encodeWav`에서 내립니다. 소리 없이 조용히 실패하는 것보다 낫습니다.
     */
    const open = async (sampleRate?: number) => {
      const context = sampleRate ? new AudioContext({ sampleRate }) : new AudioContext()
      try {
        const source = context.createMediaStreamSource(stream)
        // 사용자 조작 없이 열린 컨텍스트는 suspended로 시작합니다.
        await context.resume().catch(() => undefined)
        return { context, source }
      } catch (cause) {
        void context.close().catch(() => undefined)
        throw cause
      }
    }

    let opened: { context: AudioContext; source: MediaStreamAudioSourceNode }
    try {
      opened = await open(TARGET_SAMPLE_RATE)
    } catch (cause) {
      console.warn('[damso] 16kHz로 열지 못해 기기 표본율로 녹음합니다.', cause)
      try {
        opened = await open()
      } catch (fallbackCause) {
        console.warn('[damso] 소리를 받아올 수 없습니다.', fallbackCause)
        teardown()
        return null
      }
    }

    const { context, source } = opened
    contextRef.current = context

    takeRef.current = {
      chunks: [],
      sampleRate: context.sampleRate,
      samples: 0,
      speechMs: 0,
      silenceMs: 0,
      heard: false,
      floor: 0,
      floorSamples: 0,
      floorCount: 0,
      closed: false,
    }

    const done = new Promise<Recording | null>((resolve) => {
      resolveRef.current = resolve
    })

    try {
      await attach(context, source)
    } catch (cause) {
      console.warn('[damso] 소리를 받아올 수 없습니다.', cause)
      resolveRef.current = null
      teardown()
      return null
    }

    setRecording(true)
    return done
  }, [attach, onDenied, onStart, teardown])

  return { recording, level, heard, secondsLeft, denied, start, stop, maxSeconds: MAX_SECONDS }
}
