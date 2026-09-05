/**
 * 로그인 상태의 단 하나뿐인 출처.
 *
 * 예전에는 화면마다 "나 로그인했나?"를 다르게 물었습니다. 헤더는 아예 묻지 않아 늘 로그아웃으로
 * 그렸고, 대시보드는 fetchSession으로, 고객센터는 INVALID_ACCESS 응답으로 알아냈습니다. 그래서
 * 로그인한 사람이 홈에서는 비로그인으로 보이고, 고객센터에서는 로그인 안내를 다시 받았습니다.
 * 이제 전부 여기 status 하나를 봅니다.
 *
 * 컨텍스트와 훅이 .tsx가 아니라 .ts에 있는 이유는 eslint의 react-refresh 규칙 때문입니다 —
 * 컴포넌트 파일에서 컨텍스트를 함께 내보내면 파일이 통째로 새로고침돼 상태가 날아갑니다.
 */

import { createContext, useContext } from 'react'
import type { AccountType } from '../components/authShared'
import { toAccountType } from '../components/authShared'
import type { ApiUser } from '../utils/api'
import { loadStored } from '../utils/appData'

export const SESSION_STORAGE_KEY = 'ansimSession'
export const AUTO_LOGIN_STORAGE_KEY = 'ansimAutoLogin'

/**
 * loading은 "아직 서버에 물어보는 중"입니다. 이 상태를 비로그인으로 취급하면 새로고침할 때마다
 * 로그인 버튼이 한 번 번쩍이고, 로그인으로 취급하면 남의 화면이 잠깐 보입니다. 그래서 세 값입니다.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

/**
 * 화면이 쓰는 로그인 사용자.
 *
 * accountType이 선택값이 아닌 이유: 예전에는 undefined일 때 보호자인지 관리자인지 정할 수 없어
 * 화면마다 다르게 넘겨짚었습니다. 만드는 자리가 셋뿐이고(toSessionUser, readStoredSession,
 * ANONYMOUS_SESSION) 셋 다 값을 댈 수 있으므로 필수로 둡니다.
 */
export type SessionUser = {
  id: string
  name: string
  phone: string
  accountType: AccountType
  /** YYYY-MM-DD. 서버 USER_INFO.BIRTH_DATE. */
  birthDate?: string
  /** 가입 시각(epoch millis). "함께한 지 N일"을 세는 데 씁니다. */
  createdAt?: number
  email?: string
}

export type SessionContextValue = {
  /** 권한을 정하는 값. 서버가 확인해 준 것만 들어옵니다. */
  status: SessionStatus
  /** 화면에 그릴 값. status가 loading인 동안에는 브라우저에 남아 있던 사본일 수 있습니다. */
  user: SessionUser | null
  autoLogin: boolean
  /** 로그인 응답을 그대로 받습니다. 서버가 방금 준 값이라 다시 물을 필요가 없습니다. */
  signIn: (user: ApiUser, options?: { autoLogin?: boolean }) => void
  /** server: false는 탈퇴처럼 서버 세션이 이미 끊긴 경우입니다. */
  signOut: (options?: { server?: boolean }) => Promise<void>
  /** 서버에 다시 묻고 결과 상태를 돌려줍니다. */
  refresh: () => Promise<SessionStatus>
  updateUser: (partial: Partial<SessionUser>) => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession은 SessionProvider 안에서만 쓸 수 있습니다.')
  return value
}

/** 서버 ApiUser → 화면용 SessionUser. 변환은 이 한 곳에서만 합니다. */
export function toSessionUser(user: ApiUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone ?? '',
    accountType: toAccountType(user.roles),
    birthDate: user.birthDate,
    createdAt: user.createdAt,
    email: user.email,
  }
}

/** 게이트를 통과하기 전 코드가 참조할 수 있는 빈 값. */
export const ANONYMOUS_SESSION: SessionUser = {
  id: '',
  name: '',
  phone: '',
  accountType: 'user',
}

/**
 * 첫 화면을 즉시 그리기 위한 브라우저 사본.
 *
 * 권한 판단에는 절대 쓰지 않습니다 — 이 값은 사용자가 고칠 수 있으므로, accountType을 믿으면
 * 저장값을 'guardian'으로 바꾸는 것만으로 피보호인의 기록을 보는 화면이 열립니다. 그래서
 * 저장값이 이상하면 권한이 가장 낮은 'user'로 떨어뜨리고, 진짜 권한은 refresh()가 받아온
 * 값이 정합니다.
 */
export function readStoredSession(): SessionUser | null {
  const stored = loadStored<Partial<SessionUser> | null>(SESSION_STORAGE_KEY, null)
  if (!stored || typeof stored.id !== 'string' || typeof stored.name !== 'string') return null

  return {
    id: stored.id,
    name: stored.name,
    phone: typeof stored.phone === 'string' ? stored.phone : '',
    accountType: 'user',
    birthDate: stored.birthDate,
    createdAt: stored.createdAt,
    email: stored.email,
  }
}
