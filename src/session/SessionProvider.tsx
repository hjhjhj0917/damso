import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSession, logout as logoutRequest, type ApiUser } from '../utils/api'
import {
  AUTO_LOGIN_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  SessionContext,
  readStoredSession,
  toSessionUser,
  type SessionContextValue,
  type SessionStatus,
  type SessionUser,
} from './sessionContext'

/**
 * 앱 전체가 함께 보는 로그인 상태.
 *
 * 규칙은 하나입니다. <b>user는 그리기 위한 값, status는 정하기 위한 값.</b> 시작할 때 브라우저
 * 사본으로 user를 채우지만 status는 건드리지 않습니다. 그래서 status로 가리는 것은 전부 서버가
 * 확인해 준 것이고, user로 그리는 것은 전부 장식입니다. 사본으로 status까지 채우면 쿠키가 죽은
 * 사람에게도 로그인한 화면이 한 번 보입니다.
 */
function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredSession)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [autoLogin, setAutoLogin] = useState(
    () => localStorage.getItem(AUTO_LOGIN_STORAGE_KEY) === 'true',
  )

  /**
   * 브라우저 사본을 쓰는 곳은 여기 하나뿐입니다.
   *
   * signIn이나 updateUser 안에서 setUser와 함께 쓰면 StrictMode에서 갱신 함수가 두 번 불려
   * 저장도 두 번 일어납니다. 상태가 바뀐 결과를 보고 한 번 적는 편이 맞습니다.
   */
  useEffect(() => {
    if (user) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
  }, [user])

  const clearStorage = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(AUTO_LOGIN_STORAGE_KEY)
  }

  const refresh = useCallback(async () => {
    const result = await fetchSession()

    if (result.status !== 'success' || !result.data) {
      clearStorage()
      setUser(null)
      setAutoLogin(false)
      setStatus('anonymous')
      return 'anonymous' as SessionStatus
    }

    // 사본 위에 덮지 않고 통째로 바꿉니다. 서버 응답에 필요한 값이 다 들어 있으므로, 덮어쓰면
    // 서버에서 지워진 값이 브라우저 사본에만 남아 계속 살아납니다.
    setUser(toSessionUser(result.data))
    setStatus('authenticated')
    return 'authenticated' as SessionStatus
  }, [])

  const signIn = useCallback((apiUser: ApiUser, options?: { autoLogin?: boolean }) => {
    // 로그인 응답이 곧 세션입니다. 여기서 다시 fetchSession을 부르면 왕복만 한 번 더 늡니다.
    setUser(toSessionUser(apiUser))
    setStatus('authenticated')

    const remember = options?.autoLogin === true
    setAutoLogin(remember)
    if (remember) localStorage.setItem(AUTO_LOGIN_STORAGE_KEY, 'true')
    else localStorage.removeItem(AUTO_LOGIN_STORAGE_KEY)
  }, [])

  const signOut = useCallback(async (options?: { server?: boolean }) => {
    // 서버 세션을 먼저 끊습니다. 브라우저 쪽만 지우면 쿠키가 살아 있어 그대로 다시 들어옵니다.
    // 끊는 데 실패해도 화면은 로그아웃합니다 — 나가겠다고 누른 사람을 붙잡아 둘 수는 없습니다.
    if (options?.server !== false) await logoutRequest()

    clearStorage()
    setUser(null)
    setAutoLogin(false)
    setStatus('anonymous')
  }, [])

  const updateUser = useCallback((partial: Partial<SessionUser>) => {
    setUser((current) => (current ? { ...current, ...partial } : current))
  }, [])

  /**
   * 시작할 때 딱 한 번 서버에 묻습니다.
   *
   * StrictMode는 효과를 붙였다 떼었다 다시 붙입니다. cleanup 플래그로는 두 번째 요청 자체를
   * 막지 못하고 그 결과를 버릴 뿐이라, 빗장은 ref로 겁니다. 이 프로바이더는 앱이 끝날 때까지
   * 살아 있으므로 빗장이 필요한 재요청을 막을 일은 없습니다.
   */
  const bootstrapped = useRef(false)
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    void refresh()
  }, [refresh])

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, autoLogin, signIn, signOut, refresh, updateUser }),
    [status, user, autoLogin, signIn, signOut, refresh, updateUser],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}

export default SessionProvider
