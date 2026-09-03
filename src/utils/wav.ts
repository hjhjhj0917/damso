/**
 * 마이크에서 받은 원본 소리(PCM)를 **16kHz 모노 16bit WAV**로 만듭니다.
 *
 * 브라우저의 `MediaRecorder`는 컨테이너를 고를 수 있을 뿐(webm/opus, mp4/aac …) WAV를
 * 내주지 않습니다. 그래서 소리를 직접 받아 여기서 조립합니다.
 *
 * **16kHz / 모노 / 16bit는 설정이 아닙니다.** 서버(`SpeechService`)도 같은 형식을 전제로 하고,
 * 어긋났을 때의 증상은 오류가 아니라 "그럴듯한 헛소리 전사"입니다 — STT 서버는 헤더에 적힌 대로
 * 디코딩해 자신 있게 틀린 문장을 돌려줍니다. 바꿔야 한다면 양쪽을 같은 커밋에서 바꿔야 합니다.
 */

/** 서버가 받는 표본율입니다. */
export const TARGET_SAMPLE_RATE = 16000

export const WAV_MIME_TYPE = 'audio/wav'

/**
 * 표본율을 16kHz로 맞춥니다.
 *
 * 내려갈 때(보통 48k → 16k)는 구간 평균을 씁니다. 그냥 3칸마다 하나씩 집으면 사람 목소리보다
 * 높은 성분이 낮은 음으로 접혀 들어와(에일리어싱) 알아듣기 어려워집니다. 구간 평균은 아주 성긴
 * 저역 통과 필터라 그 접힘을 상당히 눌러 줍니다.
 *
 * 올라갈 때(마이크가 8k 같은 경우)는 선형 보간입니다. 없던 소리를 만들어 낼 수는 없지만, 적어도
 * 서버가 기대하는 표본율은 맞춰 줍니다.
 */
export function resampleTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === TARGET_SAMPLE_RATE || samples.length === 0) return samples

  const ratio = sampleRate / TARGET_SAMPLE_RATE
  const length = Math.max(1, Math.floor(samples.length / ratio))
  const out = new Float32Array(length)

  if (ratio > 1) {
    for (let i = 0; i < length; i += 1) {
      const start = Math.floor(i * ratio)
      const end = Math.min(samples.length, Math.floor((i + 1) * ratio))
      let sum = 0
      for (let j = start; j < end; j += 1) sum += samples[j]
      out[i] = end > start ? sum / (end - start) : (samples[start] ?? 0)
    }
    return out
  }

  for (let i = 0; i < length; i += 1) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(samples.length - 1, left + 1)
    const fraction = position - left
    out[i] = samples[left] * (1 - fraction) + samples[right] * fraction
  }
  return out
}

/** 흩어져 들어온 조각들을 하나로 잇습니다. */
export function mergeChunks(chunks: Float32Array[]): Float32Array {
  let total = 0
  for (const chunk of chunks) total += chunk.length

  const merged = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

/**
 * 16kHz 모노 16bit PCM WAV 한 덩어리.
 *
 * 헤더는 44바이트 표준 RIFF입니다. 서버가 확장자뿐 아니라 헤더도 보므로 길이 필드를 실제 데이터
 * 크기로 정확히 채워야 합니다.
 */
export function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const samples = resampleTo16k(mergeChunks(chunks), sampleRate)

  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }

  const byteLength = samples.length * 2
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + byteLength, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt 청크 길이
  view.setUint16(20, 1, true) // 1 = PCM(압축 없음)
  view.setUint16(22, 1, true) // 모노
  view.setUint32(24, TARGET_SAMPLE_RATE, true)
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true) // 초당 바이트
  view.setUint16(32, 2, true) // 한 표본의 바이트 수
  view.setUint16(34, 16, true) // 비트 심도
  writeText(36, 'data')
  view.setUint32(40, byteLength, true)

  // -1~1의 실수를 16bit 정수로. 범위를 넘는 값은 자릅니다(클리핑) — 그대로 두면 감싸 돌면서
  // 아주 큰 소리가 반대 부호의 잡음으로 바뀝니다.
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  }

  return new Blob([buffer], { type: WAV_MIME_TYPE })
}

/** 조각 하나의 크기(RMS). 파형 막대와 "지금 말하고 있나" 판단에 함께 씁니다. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0

  let sum = 0
  for (const sample of samples) sum += sample * sample
  return Math.sqrt(sum / samples.length)
}
