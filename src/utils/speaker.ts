/**
 * 도담의 말을 소리로 들려줍니다.
 *
 * `<audio>` 엘리먼트를 **하나만** 만들어 계속 다시 씁니다. 말풍선마다 하나씩 두면 브라우저의
 * 자동재생 정책에 걸립니다 — 사용자의 조작으로 만들어지지 않은 엘리먼트는 `play()`가 거절되고,
 * iOS Safari에서는 그 거절이 조용합니다. 그래서 첫 조작 때 이 하나를 "열어 두고"(`unlock`)
 * 그 뒤로는 소스만 갈아 끼웁니다.
 *
 * 브라우저의 `SpeechSynthesis`를 쓰지 않는 이유: 목소리가 기기마다 다르고, 어떤 기기에는
 * 한국어 음성이 아예 없습니다. 도담의 목소리는 한 사람이어야 합니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { speak as requestSpeech } from './api'

export function useSpeaker(
  options: {
    onError?: (code: string) => void
    /**
     * 한 말풍선을 **끝까지** 읽어 준 순간입니다. 중간에 멈춘 경우에는 오지 않습니다 —
     * `stop()`은 `pause()`라서 `ended`가 뜨지 않습니다.
     *
     * "도담이 말을 마쳤다"를 아는 곳은 여기뿐입니다. 이어 말하기(마이크 자동 열기)가 이걸 봅니다.
     */
    onEnded?: (id: string) => void
  } = {},
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const unlockedRef = useRef(false)

  /** 지금 소리가 나고 있는 말풍선. 화면이 그 버튼만 다르게 그립니다. */
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  /** 서버에 음성을 부탁해 둔 말풍선. 도착까지 한두 박자 걸립니다. */
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const { onError, onEnded } = options

  /** 필요할 때 하나 만들고, 그 다음부터는 같은 것을 씁니다. */
  const element = useCallback(() => {
    if (!audioRef.current) audioRef.current = new Audio()
    return audioRef.current
  }, [])

  const release = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  /** 재생을 멈추고 진행 중인 요청도 끊습니다. 녹음이 시작될 때 이것부터 부릅니다. */
  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    release()
    setSpeakingId(null)
    setLoadingId(null)
  }, [release])

  useEffect(() => stop, [stop])

  /**
   * 자동재생 잠금을 풉니다. **사용자 조작 안에서** 불러야 합니다.
   *
   * 음소거로 한 번 재생했다 멈추는 것이 전부입니다. 이 한 번이 있어야 나중에 조작 없이 도착한
   * 도담의 답을 자동으로 읽어 줄 수 있습니다.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return
    unlockedRef.current = true

    const audio = element()
    audio.muted = true
    void audio
      .play()
      .then(() => {
        audio.pause()
        audio.muted = false
      })
      .catch(() => {
        audio.muted = false
      })
  }, [element])

  /**
   * 한 말풍선을 읽어 줍니다. 이미 그 말풍선이 나오고 있으면 멈춥니다(같은 버튼이 정지 버튼).
   *
   * 앞선 재생과 앞선 요청은 여기서 끊깁니다 — 두 목소리가 겹쳐 나오는 것보다는 늦게 누른 쪽만
   * 들리는 편이 낫습니다.
   *
   * 소리가 실제로 나기 시작했으면 `true`입니다. `false`면 `onEnded`도 오지 않습니다 —
   * 그때까지 기다리는 쪽이 영영 기다리지 않도록.
   */
  const speak = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      if (speakingId === id || loadingId === id) {
        stop()
        return false
      }

      stop()
      if (!text.trim()) return false

      const controller = new AbortController()
      abortRef.current = controller
      setLoadingId(id)

      const result = await requestSpeech(text, controller.signal)

      if (controller.signal.aborted) return false
      setLoadingId(null)

      if (result.status !== 'success' || !result.blob) {
        // 사용자가 스스로 갈아탄 것은 실패가 아닙니다.
        if (result.code !== 'ABORTED') onError?.(result.code)
        return false
      }

      const url = URL.createObjectURL(result.blob)
      urlRef.current = url

      const audio = element()
      audio.src = url
      audio.onended = () => {
        setSpeakingId(null)
        release()
        onEnded?.(id)
      }

      try {
        await audio.play()
        setSpeakingId(id)
        return true
      } catch {
        // 자동재생이 막혔습니다. 버튼을 눌러 시작한 재생은 막히지 않으므로, 여기 오는 것은
        // 대개 자동 읽기입니다. 조용히 넘어가고 🔊 버튼을 남겨 둡니다.
        release()
        setSpeakingId(null)
        return false
      }
    },
    [element, loadingId, onEnded, onError, release, speakingId, stop],
  )

  return { speak, stop, unlock, speakingId, loadingId }
}
