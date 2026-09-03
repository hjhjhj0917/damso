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
 * 아래 localStorage 헬퍼는 이제 관리자 화면의 전체 회원 목록에만 남아 있습니다
 * (목록 조회 엔드포인트가 아직 없습니다).
 *
 * 보호자-어르신 연결은 USER_LINK 표와 /api/link/* 로 옮겨갔습니다. 그래서 여기 있던
 * getParentLink / saveParentLink 와 'ansimParentLinks' 저장 키는 예고대로 지웠습니다.
 * 그 값들은 브라우저 안에만 있었으므로, 저장값을 고치는 것만으로 누구의 보호자든 될 수
 * 있었습니다. 이제는 서버가 이름·생년월일·전화번호를 대조하고 동의 시각까지 남깁니다.
 */
const USERS_STORAGE_KEY = 'ansimUsers'

export function getSavedUsers(): SavedUser[] {
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY)
  return savedUsers ? (JSON.parse(savedUsers) as SavedUser[]) : []
}

export function saveSavedUsers(users: SavedUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
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
