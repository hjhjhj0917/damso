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
  INVALID_ACCESS: '로그인이 필요하거나 권한이 없습니다.',
  MAIL_SEND_FAILED: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
  EMAIL_NOT_VERIFIED: '이메일 인증을 완료해 주세요.',
  NETWORK_ERROR: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  NOT_FOUND: '요청하신 내용을 찾을 수 없습니다.',
  // AI 기능의 두 실패를 갈라 말합니다. 앞은 사용자가 기다려도 소용없고(운영자가 켜야 합니다),
  // 뒤는 다시 눌러 보면 됩니다. 한 문구로 합치면 어느 쪽인지 알 수 없어 계속 다시 누르게 됩니다.
  NOT_AVAILABLE: 'AI 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  GENERATION_FAILED: '답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  // 음성의 실패도 같은 방식으로 갈라 말합니다. NO_SPEECH는 실패가 아니라 "다시 한 번"이라
  // 서버가 성공으로 답하는 자리지만(빈 전사), 화면에는 문장이 필요합니다.
  TRANSCRIPTION_FAILED: '말씀을 글로 옮기지 못했어요. 다시 시도해 주세요.',
  SPEECH_FAILED: '음성을 들려드리지 못했어요. 다시 시도해 주세요.',
  MIC_DENIED: '마이크 사용을 허용해 주세요. 브라우저 주소창의 자물쇠에서 바꿀 수 있어요.',
  NO_SPEECH: '잘 못 들었어요. 다시 한 번 말씀해 주세요.',
  NOT_ENOUGH_SOURCE: '아직 기록이 부족해요. 도담과 조금 더 이야기를 나눠 주세요.',
  CONSENT_REQUIRED: '피보호인 계정 연결과 개인정보 이용 동의가 필요합니다.',
  ALREADY_LINKED: '이미 연결된 계정입니다.',
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
  /** YYYY-MM-DD. 주민등록번호 앞 6자리·뒷자리 첫 숫자를 프론트에서 환산한 값입니다. */
  birthDate: string
}) => post('/api/user/create', params)

// ================= 가입 이메일 인증 =================
//
// 아이디 찾기의 searchId/* 와 부품은 같지만(같은 메일 발송, 같은 코드 검증) 관문이 정반대입니다.
// 저쪽은 그 주소로 가입한 계정이 있어야 통과하고, 여기는 없어야 통과합니다 — 이미 가입된
// 주소면 서버가 DUPLICATE_EMAIL로 돌려보냅니다.
//
// verify에 이메일을 함께 보내지 않는 것에 의미가 있습니다. 어떤 주소를 인증하는 중이었는지는
// 서버가 발송 시점에 세션에 적어 두므로 코드만 맞히면 됩니다. 화면이 주소를 같이 보내면,
// 코드를 받은 주소와 다른 주소를 인증된 것으로 만들 수 있는 길이 열립니다.

export const signupSendCode = (email: string) => post('/api/user/signup/sendCode', { email })

export const signupVerify = (code: string) => post('/api/user/signup/verify', { code })

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

// ================= 보호자 연결 =================

/**
 * 서버 LinkDTO.
 *
 * verify는 wardId를 담지 않고 돌려줍니다 — 동의 전에 계정 식별자를 넘기면 이름과 전화번호를
 * 바꿔 가며 계정을 캐낼 수 있는 창구가 되기 때문입니다.
 */
export type ApiLink = {
  id?: string
  guardianId?: string
  guardianName?: string
  wardId?: string
  wardName?: string
  wardPhone?: string
  relation?: string
  consentAt?: number
  createdAt?: number
}

type LinkParams = {
  name: string
  residentFront: string
  residentBackFirst: string
  phone: string
}

/** 내 연결 목록. 보호자면 피보호인들이, 어르신이면 보호자들이 돌아옵니다. */
export const fetchLinks = () => get<ApiLink[]>('/api/link/list')

/** 대조만 해 봅니다. 연결은 만들지 않습니다. */
export const verifyWard = (params: LinkParams) => post<ApiLink>('/api/link/verify', params)

export const createLink = (params: LinkParams & { relation: string }) =>
  post<ApiLink>('/api/link/create', { ...params, consent: 'true' })

/** 보호자는 wardId를, 어르신은 guardianId를 보냅니다. 둘 중 하나만. */
export const deleteLink = (target: { wardId?: string; guardianId?: string }) =>
  post('/api/link/delete', target)

// ================= 데일리노트 =================

export type ApiComment = {
  id: string
  diaryId: string
  authorId: string
  authorName: string
  authorRoles: 'USER' | 'GUARDIAN' | 'ADMIN'
  content: string
  createdAt: number
  updatedAt: number
}

export type ApiDiary = {
  id: string
  contentId: string
  userId: string
  /** YYYY-MM-DD. 표시용 서식은 화면이 만듭니다. */
  date?: string
  title: string
  content: string
  mood?: string
  health?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  commentCount?: number
  /** 상세 조회(fetchDiary)에서만 채워집니다. 목록에는 commentCount만 옵니다. */
  comments?: ApiComment[]
}

type DiaryFields = {
  title?: string
  content?: string
  diaryDate?: string
  mood?: string
  health?: string
  /** 쉼표로 이어 보냅니다. 빈 문자열은 "태그를 전부 지워라"라는 뜻입니다. */
  tags?: string
}

export const fetchDiaries = (userId?: string) => get<ApiDiary[]>('/api/diary/list', { userId })

export const fetchDiary = (diaryId: string) => get<ApiDiary>('/api/diary/info', { diaryId })

export const createDiary = (fields: DiaryFields) => post<ApiDiary>('/api/diary/create', fields)

export const updateDiary = (diaryId: string, fields: DiaryFields) =>
  post('/api/diary/update', { diaryId, ...fields })

export const deleteDiary = (diaryId: string) => post('/api/diary/delete', { diaryId })

/** 그날 도담과 나눈 대화를 노트 한 편으로 정리합니다. */
export const generateDiary = (diaryDate: string, roomId?: string) =>
  post<ApiDiary>('/api/diary/generate', { diaryDate, roomId })

// ================= 노트 코멘트 =================
//
// 쓰기는 연결된 보호자만 할 수 있습니다. 노트 주인은 읽기만 합니다 — 서버가 정한 규칙이라
// 화면도 어르신에게는 입력창을 보여주지 않습니다.

export const fetchComments = (diaryId: string) =>
  get<ApiComment[]>('/api/diary/comment/list', { diaryId })

export const createComment = (diaryId: string, content: string) =>
  post<ApiComment>('/api/diary/comment/create', { diaryId, content })

export const updateComment = (commentId: string, content: string) =>
  post('/api/diary/comment/update', { commentId, content })

export const deleteComment = (commentId: string) =>
  post('/api/diary/comment/delete', { commentId })

// ================= 일정 =================

export type ApiScheduleType = 'HOSPITAL' | 'MEDICATION' | 'TREATMENT' | 'DAILY' | 'PERSONAL'

export type ApiSchedule = {
  id: string
  contentId: string
  userId: string
  title: string
  scheduleType: ApiScheduleType
  /** YYYY-MM-DD */
  date: string
  /** HH:mm (24시간제). "오후 3:30" 같은 표기는 화면이 만듭니다. */
  time: string
  content?: string
  location?: string
  status: 'SCHEDULED' | 'DONE'
  createdAt: number
  updatedAt: number
}

type ScheduleFields = {
  title?: string
  date?: string
  time?: string
  scheduleType?: ApiScheduleType
  content?: string
  location?: string
}

export const fetchSchedules = (params?: { userId?: string; from?: string; to?: string }) =>
  get<ApiSchedule[]>('/api/schedule/list', params)

export const createSchedule = (fields: ScheduleFields) =>
  post<ApiSchedule>('/api/schedule/create', fields)

export const updateSchedule = (scheduleId: string, fields: ScheduleFields) =>
  post('/api/schedule/update', { scheduleId, ...fields })

export const completeSchedule = (scheduleId: string, done: boolean) =>
  post('/api/schedule/complete', { scheduleId, done: String(done) })

export const deleteSchedule = (scheduleId: string) =>
  post('/api/schedule/delete', { scheduleId })

// ================= 자서전 =================

export type ApiAutobiography = {
  id: string
  contentId: string
  userId: string
  title: string
  /** "1948 — 1966", "손녀가 자주 찾아오던 무렵" 같은 자유 문자열. 날짜가 아닙니다. */
  period?: string
  summary?: string
  content: string
  status: 'DRAFT' | 'DONE'
  createdAt: number
  updatedAt: number
}

type AutobiographyFields = {
  title?: string
  content?: string
  period?: string
  summary?: string
  status?: 'DRAFT' | 'DONE'
}

export const fetchAutobiographies = (userId?: string) =>
  get<ApiAutobiography[]>('/api/autobiography/list', { userId })

export const createAutobiography = (fields: AutobiographyFields) =>
  post<ApiAutobiography>('/api/autobiography/create', fields)

export const updateAutobiography = (autobiographyId: string, fields: AutobiographyFields) =>
  post('/api/autobiography/update', { autobiographyId, ...fields })

export const deleteAutobiography = (autobiographyId: string) =>
  post('/api/autobiography/delete', { autobiographyId })

/** 쌓인 데일리노트를 엮어 새 장을 씁니다. 언제나 '작성 중'으로 저장됩니다. */
export const generateAutobiography = (period?: string) =>
  post<ApiAutobiography>('/api/autobiography/generate', { period })

// ================= 도담과의 대화 =================

export type ApiChatRoom = {
  id: string
  contentId: string
  userId: string
  title: string
  lastMessage?: string
  messageCount?: number
  createdAt: number
  updatedAt: number
}

export type ApiMessage = {
  id: string
  roomId: string
  senderType: 'USER' | 'BOT'
  message: string
  sentAt: number
}

/** reply는 없을 수 있습니다. 그때도 sent는 반드시 옵니다 — 보낸 말이 사라지지 않도록. */
export type ApiTurn = {
  sent: ApiMessage
  reply?: ApiMessage
}

export const fetchChatRooms = () => get<ApiChatRoom[]>('/api/chat/list')

export const createChatRoom = (title?: string) => post<ApiChatRoom>('/api/chat/create', { title })

export const renameChatRoom = (roomId: string, title: string) =>
  post('/api/chat/rename', { roomId, title })

export const deleteChatRoom = (roomId: string) => post('/api/chat/delete', { roomId })

export const fetchMessages = (roomId: string) =>
  get<ApiMessage[]>('/api/chat/messages', { roomId })

/**
 * 한 마디 보내고 도담의 답을 받습니다.
 *
 * 실패해도 data.sent는 실려 옵니다. 서버가 발화를 먼저 저장한 뒤 모델을 부르기 때문입니다 —
 * 화면은 어르신이 친 말을 지우지 말고 "답을 못 받았다"만 알리면 됩니다.
 */
export const say = (roomId: string, message: string) =>
  post<ApiTurn>('/api/chat/say', { roomId, message })

// ================= 공지사항 =================

export type ApiNoticeCategory = 'MAINTENANCE' | 'SAFETY' | 'UPDATE' | 'GENERAL'

/**
 * 서버 NoticeDTO.
 *
 * userId가 없습니다 — 공지는 주인이 없는 운영팀 글이라, 로그인한 사람이면 누구나 같은 목록을
 * 봅니다. category는 영문 상수로 오고 한국어 라벨은 appData의 noticeCategoryLabels가 붙입니다.
 */
export type ApiNotice = {
  id: string
  category: ApiNoticeCategory
  title: string
  summary?: string
  content: string
  important?: boolean
  /** 게시일 YYYY-MM-DD. 등록일시(createdAt)와 다를 수 있습니다. */
  date: string
  createdAt?: number
  updatedAt?: number
}

/** 조회 전용입니다. 등록·수정은 운영자가 DB에서 합니다 — 서버에 쓰기 엔드포인트가 없습니다. */
export const fetchNotices = () => get<ApiNotice[]>('/api/notice/list')

// ================= 1:1 문의 =================

export type ApiInquiryCategory =
  | 'SERVICE'
  | 'ACCOUNT'
  | 'RECORD'
  | 'HEALTH'
  | 'HOSPITAL'
  | 'PRIVACY'
  | 'PAYMENT'
  | 'ETC'

/** 접수완료 → 답변중 → 답변완료. 상태를 옮기는 것은 운영자뿐입니다. */
export type ApiInquiryStatus = 'RECEIVED' | 'ANSWERING' | 'ANSWERED'

/**
 * 서버 InquiryDTO.
 *
 * 공지와 달리 주인이 있습니다 — 목록도 상세도 내가 쓴 것만 돌아옵니다. 보호자에게도 열리지
 * 않습니다(결제·개인정보 문의가 이 자리로 옵니다).
 *
 * answer가 없으면 아직 답변 전입니다. 화면은 그 자리에 "확인하고 있습니다"를 그립니다.
 */
export type ApiInquiry = {
  id: string
  userId?: string
  category: ApiInquiryCategory
  title: string
  content: string
  status: ApiInquiryStatus
  answer?: string
  answeredAt?: number
  /** 접수일 YYYY-MM-DD. 표시용 서식은 화면이 만듭니다. */
  date: string
  createdAt?: number
  updatedAt?: number
}

/** 내가 남긴 문의만 돌아옵니다. 목록에 본문과 답변까지 실려 오므로 상세 조회를 따로 하지 않습니다. */
export const fetchInquiries = () => get<ApiInquiry[]>('/api/inquiry/list')

/** 본문은 10자 이상이어야 합니다. 짧으면 서버가 INVALID_PARAMETER로 돌려보냅니다. */
export const createInquiry = (params: {
  category: ApiInquiryCategory
  title: string
  content: string
}) => post<ApiInquiry>('/api/inquiry/create', params)

// ================= 음성 =================
//
// 두 엔드포인트의 모양이 서로 다릅니다. transcribe는 봉투를 돌려주지만 보내는 것이 폼이 아니라
// multipart이고, speak는 보내는 것은 폼이지만 돌려주는 것이 봉투가 아니라 오디오입니다.
// 그래서 위의 request()를 쓰지 못하고 각자 fetch를 부르되, 화면이 다른 호출과 똑같이 code만
// 보면 되도록 결과는 같은 봉투 모양으로 맞춰 돌려줍니다.

/** 이 배포에서 음성이 켜져 있는지. 꺼져 있으면 화면이 마이크·스피커 버튼을 아예 감춥니다. */
export const fetchSpeechConfig = () => get<{ stt: boolean; tts: boolean }>('/api/speech/config')

/**
 * 녹음을 글로 옮깁니다.
 *
 * Content-Type을 직접 지정하지 않습니다 — multipart의 boundary는 브라우저가 넣어야 하고,
 * 손으로 적으면 그 값이 실제 본문과 어긋나 서버가 파일을 찾지 못합니다.
 *
 * 파일 이름을 .wav로 주는 이유: 확장자로 형식을 판단하는 STT 서버가 있습니다.
 */
export async function transcribe(blob: Blob): Promise<ApiResult<string>> {
  try {
    const body = new FormData()
    body.append('file', blob, 'recording.wav')

    const response = await fetch('/api/speech/transcribe', {
      method: 'POST',
      credentials: 'include',
      body,
    })

    const parsed = (await response.json().catch(() => null)) as ApiResult<string> | null
    if (!parsed || typeof parsed.status !== 'string') {
      return { status: 'error', code: 'UNKNOWN_ERROR' }
    }
    return parsed
  } catch {
    return { status: 'error', code: 'NETWORK_ERROR' }
  }
}

/**
 * 글을 소리로 받아 옵니다. 성공하면 재생할 수 있는 WAV 한 덩어리입니다.
 *
 * 서버가 봉투 대신 상태 코드로 말하므로 여기서 옮깁니다: 401은 세션이 끊긴 것, 503은 기능이
 * 켜져 있지 않은 것(다시 눌러도 소용없습니다), 나머지는 다시 시도해 볼 만한 실패입니다.
 *
 * @param signal 재생을 갈아탈 때 앞선 요청을 끊는 데 씁니다. 끊긴 요청은 code가 'ABORTED'라
 *               화면이 그 실패는 알리지 않습니다 — 사용자가 스스로 바꾼 것이기 때문입니다.
 */
export async function speak(
  text: string,
  signal?: AbortSignal,
): Promise<{ status: ApiStatus; code: string; blob?: Blob }> {
  try {
    const response = await fetch('/api/speech/speak', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: toFormBody({ text }),
      signal,
    })

    if (!response.ok) {
      const code =
        response.status === 401
          ? 'INVALID_ACCESS'
          : response.status === 503
            ? 'NOT_AVAILABLE'
            : 'SPEECH_FAILED'
      return { status: 'error', code }
    }

    return { status: 'success', code: 'SPEECH_COMPLETE', blob: await response.blob() }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'error', code: 'ABORTED' }
    }
    return { status: 'error', code: 'NETWORK_ERROR' }
  }
}
