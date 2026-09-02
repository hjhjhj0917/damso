import { useState } from 'react'

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

export const MASTER_ACCOUNT_ID = 'master'
const MASTER_PASSWORD_DEFAULT = '1234'

// 마스터(관리자) 로그인 여부를 판별합니다. 비밀번호는 localStorage의 'ansimMasterPassword'로 덮어쓸 수 있습니다.
export function isMasterCredential(id: string, password: string) {
  return (
    normalizeId(id) === MASTER_ACCOUNT_ID &&
    password === (localStorage.getItem('ansimMasterPassword') ?? MASTER_PASSWORD_DEFAULT)
  )
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 시연용 목업 인증번호입니다. 실제 이메일 발송은 연동되어 있지 않습니다.
export const DEMO_AUTH_CODE = '123456'

export const AUTH_INPUT_CLASS =
  'h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white'

const USERS_STORAGE_KEY = 'ansimUsers'

export function getSavedUsers(): SavedUser[] {
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY)
  return savedUsers ? (JSON.parse(savedUsers) as SavedUser[]) : []
}

export function saveSavedUsers(users: SavedUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

type EmailVerificationOptions = {
  /** 인증 메일 발송 전 추가 검증. 에러 메시지를 반환하면 발송을 막습니다. */
  onBeforeSend?: (email: string) => string | null
}

/** 이메일 인증번호 발송 → 확인 흐름을 다루는 공용 훅. 아이디/비밀번호 찾기, 회원가입에서 재사용합니다. */
export function useEmailVerification({ onBeforeSend }: EmailVerificationOptions = {}) {
  const [email, setEmailValue] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [isAuthRequested, setIsAuthRequested] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
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

  const requestAuth = () => {
    setError('')
    setIsVerified(false)
    const trimmedEmail = email.trim()
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return false
    }
    const validationError = onBeforeSend?.(trimmedEmail)
    if (validationError) {
      setError(validationError)
      return false
    }
    setAuthCode('')
    setIsAuthRequested(true)
    alert(`인증 이메일이 발송되었습니다. 시연용 인증번호는 ${DEMO_AUTH_CODE}입니다.`)
    return true
  }

  const verify = () => {
    if (authCode !== DEMO_AUTH_CODE) {
      setError('인증번호가 맞지 않습니다.')
      return false
    }
    setError('')
    setIsVerified(true)
    return true
  }

  return {
    email,
    setEmail,
    authCode,
    setAuthCode,
    isAuthRequested,
    isVerified,
    error,
    setError,
    requestAuth,
    verify,
    resetVerification,
  }
}
