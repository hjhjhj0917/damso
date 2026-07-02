export type ChatMessage = {
  id: number
  role: 'ai' | 'user'
  text: string
  time: string
}

export type DailyNote = {
  id: number
  date: string
  title: string
  content: string
  mood: string
  tags: string[]
  health: string
}

export type BiographyChapter = {
  id: number
  title: string
  period: string
  summary: string
  status: '완성' | '작성 중'
}

export type ScheduleEvent = {
  id: number
  date: string
  time: string
  title: string
  type: 'hospital' | 'medication' | 'treatment' | 'daily'
  description: string
  location?: string
  status: '예정' | '완료'
}

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

export const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'ai',
    text: '안녕하세요, 순자님. 오늘 하루는 어떠셨어요? 천천히 들려주세요. 제가 곁에서 잘 기억해 둘게요.',
    time: '오후 8:01',
  },
  {
    id: 2,
    role: 'user',
    text: '오늘은 날씨가 좋아서 아침에 동네 공원을 한 바퀴 걸었어. 오랜만에 정희도 만나서 같이 이야기를 나눴지.',
    time: '오후 8:02',
  },
  {
    id: 3,
    role: 'ai',
    text: '정희님을 만나셨군요. 좋은 날씨에 친구와 함께 걸으셔서 마음도 한결 가벼우셨겠어요. 산책할 때 몸은 괜찮으셨어요?',
    time: '오후 8:02',
  },
  {
    id: 4,
    role: 'user',
    text: '걷는 동안은 좋았는데 집에 돌아오니 오른쪽 무릎이 조금 뻐근했어. 지금은 많이 괜찮아졌어.',
    time: '오후 8:03',
  },
  {
    id: 5,
    role: 'ai',
    text: '지금은 괜찮아지셨다니 다행이에요. 오늘은 무릎에 무리가 가지 않도록 따뜻하게 찜질하고 편히 쉬어주세요. 아침 혈압약은 챙겨 드셨나요?',
    time: '오후 8:03',
  },
  {
    id: 6,
    role: 'user',
    text: '응, 아침 식사를 하고 바로 먹었어. 저녁에는 손녀가 전화도 해줘서 기분 좋은 하루였지.',
    time: '오후 8:04',
  },
  {
    id: 7,
    role: 'ai',
    text: '약도 잘 챙기시고 손녀분 목소리까지 들으셨다니 참 따뜻한 하루였네요. 오늘 이야기는 산책과 친구, 무릎 상태, 복약 기록으로 잘 정리해 둘게요.',
    time: '오후 8:04',
  },
]

export const initialNotes: DailyNote[] = [
  {
    id: 1,
    date: '2026. 07. 02',
    title: '오랜만에 만난 정희와의 산책',
    content:
      '아침 식사 후 동네 공원을 걸었다. 오래된 친구 정희를 우연히 만나 벤치에 앉아 한참 이야기를 나눴다. 날씨도 선선하고 마음도 한결 가벼워진 하루였다.',
    mood: '평온해요',
    tags: ['산책', '친구', '좋은 하루'],
    health: '걸음 6,240보 · 기분 좋음',
  },
  {
    id: 2,
    date: '2026. 07. 01',
    title: '손녀와 함께 만든 감자전',
    content:
      '손녀가 놀러 와서 함께 감자전을 만들었다. 모양은 조금 서툴렀지만 웃음이 끊이지 않았다. 저녁에는 혈압약을 챙겨 먹고 일찍 쉬었다.',
    mood: '행복해요',
    tags: ['가족', '요리', '추억'],
    health: '혈압약 복용 · 수면 7시간',
  },
  {
    id: 3,
    date: '2026. 06. 30',
    title: '비 오는 날의 조용한 오후',
    content:
      '비가 종일 내려 집에서 오래된 사진첩을 꺼내 보았다. 젊은 시절 가족 여행 사진을 보며 그때 이야기를 AI 파트너에게 들려주었다.',
    mood: '그리워요',
    tags: ['사진', '가족', '회상'],
    health: '활동량 낮음 · 컨디션 보통',
  },
]

export const initialChapters: BiographyChapter[] = [
  {
    id: 1,
    title: '1장 · 바닷바람 속에서 자란 아이',
    period: '1948 — 1966',
    summary:
      '작은 바닷가 마을에서 보낸 유년 시절과 부모님, 네 남매가 함께했던 따뜻한 기억을 담았습니다.',
    status: '완성',
  },
  {
    id: 2,
    title: '2장 · 서울, 새로운 시작',
    period: '1967 — 1975',
    summary:
      '스무 살에 처음 도착한 서울, 첫 직장과 평생의 동반자를 만난 설레는 시절의 이야기입니다.',
    status: '완성',
  },
  {
    id: 3,
    title: '3장 · 우리라는 이름의 시간',
    period: '1976 — 2005',
    summary:
      '아이들을 키우며 울고 웃었던 날들과 가족을 위해 단단해졌던 시간을 정리하고 있습니다.',
    status: '작성 중',
  },
]

export const initialSchedules: ScheduleEvent[] = [
  {
    id: 1,
    date: '2026-07-02',
    time: '오전 8:00',
    title: '아침 혈압약 복용',
    type: 'medication',
    description: '아침 식사 후 혈압약을 복용했습니다. 도담이 복약 완료를 확인했어요.',
    status: '완료',
  },
  {
    id: 2,
    date: '2026-07-02',
    time: '오후 8:30',
    title: '오늘의 일상 기록',
    type: 'daily',
    description: '도담과 오늘 있었던 일을 이야기하고 데일리노트를 작성할 예정이에요.',
    status: '예정',
  },
  {
    id: 3,
    date: '2026-07-03',
    time: '오후 3:30',
    title: '늘봄내과 정기 검진',
    type: 'hospital',
    description: '혈압 정기 검진과 처방 상담이 예약되어 있습니다.',
    location: '늘봄내과의원 · 서울 종로구',
    status: '예정',
  },
  {
    id: 4,
    date: '2026-07-06',
    time: '오전 10:00',
    title: '무릎 물리치료',
    type: 'treatment',
    description: '오른쪽 무릎 물리치료 3회차 일정입니다. 치료 후 통증 정도를 기록해 주세요.',
    location: '한마음정형외과',
    status: '예정',
  },
  {
    id: 5,
    date: '2026-06-30',
    time: '오후 2:00',
    title: '무릎 물리치료 2회차',
    type: 'treatment',
    description: '온열 치료와 가벼운 재활 운동을 진행했습니다. 치료 후 통증이 줄었다고 기록했어요.',
    location: '한마음정형외과',
    status: '완료',
  },
]

export const quickPrompts = [
  '오늘 있었던 일을 이야기할게',
  '몸이 조금 불편했어',
  '옛날 추억이 생각났어',
]

export function loadStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function todayKorean() {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('. ', '. ')
}
