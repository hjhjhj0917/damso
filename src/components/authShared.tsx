import { useState } from 'react'
import type { ApiResult, ApiUser } from '../utils/api'
import { errorMessage } from '../utils/api'

export type AccountType = 'user' | 'guardian' | 'admin'

export function normalizeId(value: string) {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string) {
  return value.trim().replaceAll('-', '')
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const RESIDENT_FRONT_PATTERN = /^\d{6}$/
export const RESIDENT_BACK_PATTERN = /^[1-4]$/

/**
 * 주민등록번호 앞 6자리와 뒷자리 첫 숫자를 YYYY-MM-DD로 환산합니다. 서버
 * LinkService.birthDateOf와 같은 규칙입니다 — 주민등록번호 자체는 어디에도 보내거나
 * 저장하지 않고, 이 결과(생년월일)만 회원가입 시 USER_INFO.BIRTH_DATE에 남습니다.
 *
 * 뒷자리 첫 숫자는 세기를 정하는 데만 씁니다(1·2 → 1900년대, 3·4 → 2000년대).
 */
export function residentToBirthDate(residentFront: string, residentBackFirst: string): string | null {
  if (!RESIDENT_FRONT_PATTERN.test(residentFront)) return null
  if (!RESIDENT_BACK_PATTERN.test(residentBackFirst)) return null

  const century = residentBackFirst <= '2' ? '19' : '20'
  const year = century + residentFront.slice(0, 2)
  const month = residentFront.slice(2, 4)
  const day = residentFront.slice(4, 6)

  const monthValue = Number(month)
  const dayValue = Number(day)
  if (monthValue < 1 || monthValue > 12 || dayValue < 1 || dayValue > 31) return null

  return `${year}-${month}-${day}`
}

export const AUTH_INPUT_CLASS =
  'h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white'

/** 서버 ROLES 값을 화면이 쓰는 accountType으로 옮깁니다. */
export function toAccountType(roles: ApiUser['roles']): AccountType {
  if (roles === 'GUARDIAN') return 'guardian'
  if (roles === 'ADMIN') return 'admin'
  return 'user'
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
