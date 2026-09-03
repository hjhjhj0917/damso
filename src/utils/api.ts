/**
 * 백엔드(/api) 호출 계층.
 *
 * 서버는 모든 응답을 {status, code, data} 봉투에 담아 돌려줍니다. 화면은 code만 보고 분기하고,
 * 사람이 읽을 문장은 여기 있는 MESSAGES에서 꺼내 씁니다. 문구를 화면마다 적어 두면 같은
 * 에러가 화면마다 다르게 보이기 때문입니다.
 */

export type ApiStatus = 'success' | 'error'

export type ApiResult<T = undefined> = {
  status: ApiStatus
  code: string
  data?: T
}

/** 서버 UserDTO.PlainUserDTO와 같은 모양. */
export type ApiUser = {
  id: string
  name: string
  email?: string
  phone?: string
  roles: 'USER' | 'GUARDIAN' | 'ADMIN'
  birthDate?: string
  onboardingCompleted?: boolean
  createdAt?: number
  updatedAt?: number
}

/**
 * 서버가 돌려주는 에러 코드를 화면 문구로 옮깁니다.
 *
 * 로그인 실패가 "아이디 또는 비밀번호"인 이유는 서버가 그렇게 답하기 때문입니다 — 없는
 * 아이디와 틀린 비밀번호를 같은 코드로 돌려줘서, 어떤 아이디가 가입돼 있는지 알아내지
 * 못하게 합니다. 화면에서 둘을 갈라 말하면 그 방어가 무의미해집니다.
 */
const MESSAGES: Record<string, string> = {
  MISSING_PARAMETER: '필수 항목이 비어 있습니다.',
  INVALID_PARAMETER: '입력값을 다시 확인해 주세요.',
  INVALID_ID: '아이디는 영문, 숫자, 밑줄로 4~20자여야 합니다.',
  INVALID_PASSWORD: '비밀번호는 8자 이상이어야 합니다.',
  INVALID_NAME: '이름을 2자 이상 입력해 주세요.',
  INVALID_PHONE: '올바른 전화번호를 입력해 주세요.',
  INVALID_EMAIL: '올바른 이메일 주소를 입력해 주세요.',
  INVALID_ROLE: '가입할 수 없는 계정 유형입니다.',
  DUPLICATE_ID: '이미 사용 중인 아이디입니다.',
  DUPLICATE_EMAIL: '이미 가입에 사용된 이메일입니다.',
  SIGNIN_NO_MATCHES: '아이디 또는 비밀번호가 올바르지 않습니다.',
  USER_NOT_FOUND: '입력한 정보와 일치하는 계정이 없습니다.',
  INVALID_CODE: '인증번호가 맞지 않습니다.',
  INVALID_ACCESS: '로그인이 필요하거나 인증 절차를 먼저 완료해야 합니다.',
  MAIL_SEND_FAILED: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
  NETWORK_ERROR: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

export function messageOf(code: string) {
  return MESSAGES[code] ?? MESSAGES.UNKNOWN_ERROR
}

/** 성공이 아닐 때 보여줄 문장. 성공이면 빈 문자열. */
export function errorMessage(result: ApiResult<unknown>) {
  return result.status === 'success' ? '' : messageOf(result.code)
}

type Params = Record<string, string | undefined>

function toFormBody(params: Params) {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.append(key, value)
  }
  return body
}

/**
 * 서버는 파라미터를 request.getParameter로 읽습니다. 즉 JSON이 아니라 폼 인코딩으로 보내야
 * 하고, 한글이 깨지지 않도록 charset을 명시합니다.
 *
 * credentials: 'include'가 빠지면 세션 쿠키가 실리지 않아, 로그인에 성공해도 다음 요청부터
 * 다시 비로그인 상태가 됩니다.
 */
async function request<T>(path: string, params?: Params, method: 'GET' | 'POST' = 'POST'): Promise<ApiResult<T>> {
  try {
    const url = method === 'GET' && params ? `${path}?${toFormBody(params)}` : path
    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers:
        method === 'POST'
          ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
          : undefined,
      body: method === 'POST' ? toFormBody(params ?? {}) : undefined,
    })

    // 봉투가 아닌 응답(4xx/5xx 기본 오류 페이지 등)은 파싱에 실패합니다. 그때도 화면은
    // 똑같이 code만 보면 되도록 봉투 모양으로 맞춰 돌려줍니다.
    const parsed = (await response.json().catch(() => null)) as ApiResult<T> | null
    if (!parsed || typeof parsed.status !== 'string') {
      return { status: 'error', code: 'UNKNOWN_ERROR' }
    }
    return parsed
  } catch {
    return { status: 'error', code: 'NETWORK_ERROR' }
  }
}

const get = <T>(path: string, params?: Params) => request<T>(path, params, 'GET')
const post = <T>(path: string, params?: Params) => request<T>(path, params, 'POST')

// ================= 가입 =================

export const checkIdExists = (id: string) =>
  get<{ exists: boolean }>('/api/user/getIdExists', { id })

export const checkEmailExists = (email: string) =>
  get<{ exists: boolean }>('/api/user/getEmailExists', { email })

export const signup = (params: {
  id: string
  password: string
  name: string
  phone: string
  email: string
  roles: 'USER' | 'GUARDIAN'
}) => post('/api/user/create', params)

// ================= 로그인 =================

export const login = (id: string, password: string) =>
  post<ApiUser>('/api/user/login', { id, password })

export const fetchSession = () => get<ApiUser>('/api/user/session')

export const logout = () => post('/api/user/logout')

// ================= 마이페이지 =================

export const fetchInfo = () => get<ApiUser>('/api/user/info')

export const updateProfile = (params: { name?: string; phone?: string; birthDate?: string }) =>
  post('/api/user/update', params)

export const changePassword = (currentPassword: string, newPassword: string) =>
  post('/api/user/changePassword', { currentPassword, newPassword })

export const completeOnboarding = () => post('/api/user/onboarding/complete')

export const withdraw = (password: string) => post('/api/user/withdraw', { password })

// ================= 아이디 찾기 =================

export const findIdSendCode = (email: string) =>
  post('/api/user/searchId/sendCode', { email })

export const findIdVerify = (code: string) =>
  post<{ id: string }>('/api/user/searchId/verify', { code })

// ================= 비밀번호 재설정 =================

export const resetSendCode = (id: string, email: string) =>
  post('/api/user/searchPassword', { id, email })

export const resetVerifyCode = (code: string) => post('/api/user/verifyResetCode', { code })

export const resetNewPassword = (password: string) =>
  post('/api/user/newPassword', { password })
