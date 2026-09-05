/**
 * 화면이 함께 쓰는 상수와 표시용 변환.
 *
 * 도메인 타입은 여기 없습니다. 서버가 돌려주는 모양이 곧 타입이라 `utils/api.ts`에
 * ApiDiary / ApiSchedule / ApiAutobiography / ApiMessage 로 있습니다. 예전에는 이 파일에
 * DailyNote, ScheduleEvent 같은 타입과 목업 데이터가 함께 있었지만, 그 둘이 서로 어긋나면
 * 화면은 멀쩡히 그려지면서 저장만 안 되는 상태가 됩니다.
 *
 * 여기 남은 것은 "서버 값 → 사람이 읽는 문자열"뿐입니다. 서버는 날짜를 YYYY-MM-DD로, 시각을
 * 24시간제 HH:mm으로, 상태를 영문 상수로 줍니다. 한국어 표기를 만드는 일은 화면의 몫입니다.
 */

import type {
  ApiInquiryCategory,
  ApiInquiryStatus,
  ApiNoticeCategory,
  ApiRecallCategory,
  ApiRecallPeriod,
  ApiSchedule,
  ApiScheduleType,
} from './api'

export const navItems = [
  { id: 'home', label: '홈', icon: '⌂' },
  { id: 'chat', label: 'AI 파트너', icon: '✦' },
  { id: 'notes', label: '데일리노트', icon: '▤' },
  { id: 'calendar', label: '일정 캘린더', icon: '▦' },
  { id: 'biography', label: '나의 자서전', icon: '▥' },
  { id: 'health', label: '건강 리포트', icon: '♡' },
  { id: 'mypage', label: '마이페이지', icon: '●' },
] as const

export type ServiceTab = (typeof navItems)[number]['id']

export const quickPrompts = [
  '오늘 있었던 일을 이야기할게',
  '몸이 조금 불편했어',
  '옛날 추억이 생각났어',
]

/**
 * 노트 작성 화면의 기분 선택지.
 *
 * 서버 DIARY.MOOD에는 CHECK 제약이 없습니다 — 이 문구는 도메인 상수가 아니라 화면 카피라서
 * 여기서 바꾸면 됩니다. 대신 자서전/일정의 상태 값은 반대입니다(서버 enum과 CHECK가 있습니다).
 */
export const moodOptions = ['행복해요', '평온해요', '편안해요', '그리워요', '속상해요']

export function loadStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

/** 오늘 날짜를 서버가 쓰는 YYYY-MM-DD로. 'sv-SE'는 로컬 시각 기준 ISO 날짜를 줍니다. */
export function todayISO(now: Date = new Date()) {
  return now.toLocaleDateString('sv-SE')
}

/** YYYY-MM-DD → "2026. 07. 02". 값이 없으면 빈 문자열. */
export function formatDate(iso?: string) {
  if (!iso) return ''
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return iso
  return `${match[1]}. ${match[2]}. ${match[3]}`
}

/**
 * 날짜 → "2026년 7월 2일 목요일". 홈 화면 눈썹 문구가 씁니다.
 *
 * 기본값이 오늘인 것에 의미가 있습니다. 예전에는 이 문구가 "2026년 7월 2일 목요일"이라는
 * 문자열로 박혀 있어서, 어느 날 열어도 그날이라고 적혀 있었습니다.
 */
export function formatLongDate(now: Date = new Date()) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)
}

/**
 * 가입 시각(epoch millis) → 오늘까지의 일수. 가입 당일이 1일입니다. 값이 없으면 null.
 *
 * 양쪽을 자정으로 맞춘 뒤에 뺍니다. 그냥 빼서 86400000으로 나누면 가입한 지 23시간 된 사람과
 * 1시간 된 사람이 달력상 하루 차이여도 같은 숫자를 보게 됩니다.
 */
export function daysSince(millis?: number, now: Date = new Date()) {
  if (!millis) return null
  const start = new Date(millis)
  start.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1
}

/** epoch millis → "7월 2일 오후 8:04". 코멘트와 대화 목록이 씁니다. */
export function formatMoment(millis?: number) {
  if (!millis) return ''
  return new Date(millis).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** epoch millis → "오후 8:04". 말풍선 옆에 붙는 시각. */
export function formatTime(millis?: number) {
  if (!millis) return ''
  return new Date(millis).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

/**
 * 일정 시간 문자열을 24시간제 { hour, minute }로 변환합니다. 형식이 아니면 null.
 * 서버는 "14:05"만 보내지만, 예전에 저장된 "오후 3:30" 표기도 계속 읽습니다.
 */
export function parseKoreanTime(time: string): { hour: number; minute: number } | null {
  const koreanMatch = time.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/)
  if (koreanMatch) {
    const [, period, hourText, minuteText] = koreanMatch
    let hour = Number(hourText) % 12
    if (period === '오후') hour += 12
    return { hour, minute: Number(minuteText) }
  }
  const plainMatch = time.match(/^(\d{1,2}):(\d{2})$/)
  if (plainMatch) {
    const [, hourText, minuteText] = plainMatch
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (hour > 23 || minute > 59) return null
    return { hour, minute }
  }
  return null
}

/** 서버가 주는 "14:05"를 "오후 2:05"로. */
export function toKoreanTimeLabel(time24: string): string {
  const match = time24.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return time24
  const hour24 = Number(match[1])
  const minute = match[2]
  const period = hour24 < 12 ? '오전' : '오후'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${period} ${hour12}:${minute}`
}

/** 일정 종류 라벨. 서버는 영문 상수로 저장하고 한국어는 여기서 붙입니다. */
export const scheduleTypeLabels: Record<ApiScheduleType, string> = {
  HOSPITAL: '병원',
  MEDICATION: '복약',
  TREATMENT: '치료',
  DAILY: '일상',
  PERSONAL: '개인',
}

/** 일정 상태 라벨. */
export function scheduleStatusLabel(status: ApiSchedule['status']) {
  return status === 'DONE' ? '완료' : '예정'
}

/** 공지 분류 라벨. 서버는 NOTICE.CATEGORY의 영문 상수로 주고 한국어는 여기서 붙입니다. */
export const noticeCategoryLabels: Record<ApiNoticeCategory, string> = {
  MAINTENANCE: '점검 안내',
  SAFETY: '안전 안내',
  UPDATE: '업데이트',
  GENERAL: '일반 공지',
}

/** 1:1 문의 분류 라벨. 서버는 INQUIRY.CATEGORY의 영문 상수로 주고 한국어는 여기서 붙입니다. */
export const inquiryCategoryLabels: Record<ApiInquiryCategory, string> = {
  SERVICE: '서비스 이용',
  ACCOUNT: '계정·피보호인 연동',
  RECORD: 'AI 대화·기록',
  HEALTH: '건강 리포트',
  HOSPITAL: '병원 예약',
  PRIVACY: '개인정보',
  PAYMENT: '결제·환불',
  ETC: '기타',
}

/** 1:1 문의 상태 라벨. */
export const inquiryStatusLabels: Record<ApiInquiryStatus, string> = {
  RECEIVED: '접수완료',
  ANSWERING: '답변중',
  ANSWERED: '답변완료',
}

/** 기억 키워드 분류 라벨. 서버는 RECALL_KEYWORD.CATEGORY의 영문 상수로 줍니다. */
export const recallCategoryLabels: Record<ApiRecallCategory, string> = {
  FAMILY: '가족',
  PLACE: '장소',
  EVENT: '사건',
  DAILY: '일상',
  ETC: '기타',
}

/**
 * 건강 리포트의 기간 선택.
 *
 * 화면에 적힌 말과 서버가 아는 상수를 여기서 잇습니다. 예전에는 select가 한국어 문자열만
 * 들고 있어서 바꿔도 아무 일이 일어나지 않았습니다.
 */
export const recallPeriods: { value: ApiRecallPeriod; label: string }[] = [
  { value: 'WEEK', label: '이번 주' },
  { value: 'MONTH', label: '지난 4주' },
  { value: 'QUARTER', label: '최근 3개월' },
]

/** 자서전 상태 라벨. */
export function autobiographyStatusLabel(status: 'DRAFT' | 'DONE') {
  return status === 'DONE' ? '완성' : '작성 중'
}

/** 일정 종류에 맞는 알림 문구를 만듭니다. */
export function scheduleReminderMessage(schedule: ApiSchedule) {
  switch (schedule.scheduleType) {
    case 'MEDICATION':
      return `지금 '${schedule.title}' 시간이에요. 복약을 잊지 마세요!`
    case 'HOSPITAL':
      return `'${schedule.title}' 시간이 다가와요. 준비해 주세요.`
    case 'TREATMENT':
      return `'${schedule.title}' 시간이에요.`
    case 'DAILY':
      return `'${schedule.title}' 시간이에요. 오늘 이야기를 들려주세요.`
    default:
      return `'${schedule.title}' 일정이 있어요.`
  }
}

/**
 * 오늘 날짜의 '예정' 상태 일정 중 지금 시각에 도달했고 아직 알리지 않은 항목을 찾습니다.
 * alreadyNotifiedIds는 스팸 방지를 위한 집합입니다.
 *
 * ID가 문자열인 것에 주의하세요. 서버의 모든 기본키가 VARCHAR라 예전의 Set<number>는
 * 아무것도 걸러 내지 못합니다 — 에러 없이 알림만 반복되는 종류의 고장이라 눈에 잘 안 띕니다.
 */
export function findDueSchedules(
  schedules: ApiSchedule[],
  alreadyNotifiedIds: ReadonlySet<string>,
  now: Date = new Date(),
): ApiSchedule[] {
  const today = todayISO(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return schedules.filter((schedule) => {
    if (schedule.status !== 'SCHEDULED') return false
    if (schedule.date !== today) return false
    if (alreadyNotifiedIds.has(schedule.id)) return false
    const parsed = parseKoreanTime(schedule.time)
    if (!parsed) return false
    return nowMinutes >= parsed.hour * 60 + parsed.minute
  })
}
