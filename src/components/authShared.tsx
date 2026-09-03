import { useState } from 'react'
import type { ApiResult, ApiUser } from '../utils/api'
import { errorMessage } from '../utils/api'

export type AccountType = 'user' | 'guardian' | 'admin'

export type ParentProfile = {
  name: string
  birthDate?: string
  residentFront: string
  residentBackFirst: string
  phone: string
  relation: string
  address: string
  consentAt: string
}

type UserIdType = 'username' | 'email' | 'phone'

export type SavedUser = {
  id: string
  idType: UserIdType
  password: string
  phone: string
  name: string
  email?: string
  accountType?: AccountType
  parent?: ParentProfile
  // 기존 브라우저 저장 데이터와의 호환을 위해 이전 필드는 선택값으로 유지합니다.
  carrier?: 'SKT' | 'KT' | 'LG U+' | '알뜰폰'
  residentFront?: string
  residentBackFirst?: string
}

export function normalizeId(value: string) {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string) {
  return value.trim().replaceAll('-', '')
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const AUTH_INPUT_CLASS =
  'h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white'

/** 서버 ROLES 값을 화면이 쓰는 accountType으로 옮깁니다. */
export function toAccountType(roles: ApiUser['roles']): AccountType {
  if (roles === 'GUARDIAN') return 'guardian'
  if (roles === 'ADMIN') return 'admin'
  return 'user'
}

/*
 * 아래 localStorage 헬퍼는 아직 서버로 옮기지 못한 두 가지에만 남아 있습니다.
 *
 *   - 보호자-어르신 연결 (USER_LINK 테이블과 API가 아직 없음)
 *   - 관리자 화면의 전체 회원 목록 (목록 조회 엔드포인트가 아직 없음)
 *
 * 가입/로그인/찾기/마이페이지는 전부 utils/api.ts를 거칩니다. 위 두 기능이 서버로 옮겨가면
 * 이 헬퍼와 SavedUser 타입도 함께 지워야 합니다.
 */
const USERS_STORAGE_KEY = 'ansimUsers'

export function getSavedUsers(): SavedUser[] {
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY)
  return savedUsers ? (JSON.parse(savedUsers) as SavedUser[]) : []
}

export function saveSavedUsers(users: SavedUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

/**
 * 보호자가 연결한 피보호인 정보. 회원 정보가 서버로 옮겨가면서 SavedUser에 얹어 두던
 * parent 필드가 갈 곳을 잃어, 회원 ID를 키로 따로 보관합니다. USER_LINK API가 생기면
 * 이 두 함수와 저장 키를 함께 지웁니다.
 */
const PARENT_LINK_STORAGE_KEY = 'ansimParentLinks'

type ParentLinkMap = Record<string, ParentProfile>

export function getParentLink(userId: string): ParentProfile | undefined {
  const stored = localStorage.getItem(PARENT_LINK_STORAGE_KEY)
  if (!stored) return undefined
  return (JSON.parse(stored) as ParentLinkMap)[userId]
}

export function saveParentLink(userId: string, parent: ParentProfile) {
  const stored = localStorage.getItem(PARENT_LINK_STORAGE_KEY)
  const map = stored ? (JSON.parse(stored) as ParentLinkMap) : {}
  map[userId] = parent
  localStorage.setItem(PARENT_LINK_STORAGE_KEY, JSON.stringify(map))
}

type EmailVerificationOptions = {
  /** 인증번호 발송 요청. 서버 응답을 그대로 돌려주면 됩니다. */
  onSend: (email: string) => Promise<ApiResult<unknown>>
  /** 인증번호 확인 요청. */
  onVerify: (code: string) => Promise<ApiResult<unknown>>
}

/**
 * 인증번호 발송 → 확인 흐름을 다루는 공용 훅. 아이디 찾기와 비밀번호 재설정이 함께 씁니다.
 *
 * 두 화면이 부르는 엔드포인트가 서로 다르기 때문에 호출 자체는 바깥에서 주입받고, 여기서는
 * 입력값·발송 여부·확인 여부·에러 문구만 관리합니다.
 */
export function useEmailVerification({ onSend, onVerify }: EmailVerificationOptions) {
  const [email, setEmailValue] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [isAuthRequested, setIsAuthRequested] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const resetVerification = () => {
    setIsAuthRequested(false)
    setIsVerified(false)
    setAuthCode('')
    setError('')
  }

  const setEmail = (value: string) => {
    setEmailValue(value)
    resetVerification()
  }

  const requestAuth = async () => {
    setError('')
    setIsVerified(false)
    const trimmedEmail = email.trim()
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return false
    }

    setIsPending(true)
    const result = await onSend(trimmedEmail)
    setIsPending(false)

    if (result.status !== 'success') {
      setError(errorMessage(result))
      return false
    }

    setAuthCode('')
    setIsAuthRequested(true)
    return true
  }

  const verify = async () => {
    setIsPending(true)
    const result = await onVerify(authCode)
    setIsPending(false)

    if (result.status !== 'success') {
      setError(errorMessage(result))
      return null
    }

    setError('')
    setIsVerified(true)
    return result
  }

  return {
    email,
    setEmail,
    authCode,
    setAuthCode,
    isAuthRequested,
    isVerified,
    isPending,
    error,
    setError,
    requestAuth,
    verify,
    resetVerification,
  }
}
