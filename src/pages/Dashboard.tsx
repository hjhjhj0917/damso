import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getSavedUsers,
  normalizeId,
  normalizePhone,
  saveSavedUsers,
  type AccountType,
  type ParentProfile,
  type SavedUser,
} from "../components/authShared";
import AdminView from "./AdminView";
import { PrivacyView } from "./Support";
import {
  findDueSchedules,
  initialChapters,
  initialMessages,
  initialNotes,
  initialSchedules,
  loadStored,
  navItems,
  quickPrompts,
  scheduleReminderMessage,
  toKoreanTimeLabel,
  todayKorean,
  type BiographyChapter,
  type ChatMessage,
  type DailyNote,
  type NoteComment,
  type ScheduleEvent,
  type ServiceTab,
} from "../utils/appData";
import {
  searchHospitalsByAddress,
  type HospitalSearchResult,
} from "../utils/kakaoLocal";

type Session = {
  id: string;
  name: string;
  phone: string;
  accountType?: AccountType;
  parentName?: string;
  parentPhone?: string;
  parentRelation?: string;
};
type Toast = { message: string; tone?: "blue" | "green" };
type FamilyContact = {
  id: number;
  name: string;
  relation: string;
  phone: string;
  emoji: string;
};
type MyHospital = {
  id: number;
  name: string;
  phone: string;
  department?: string;
  address?: string;
};
type HealthLogEntry = {
  id: number;
  date: string;
  heartRate?: number;
  weightKg?: number;
};
type ParentLink = Pick<
  ParentProfile,
  "name" | "phone" | "relation" | "residentFront" | "residentBackFirst"
>;
type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
};
type AppNotification = {
  id: number;
  message: string;
  createdAt: string;
  tab: ServiceTab;
  targetRole?: "user" | "guardian";
};
type Announcement = {
  id: number;
  category: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  important?: boolean;
};

const familyContacts: FamilyContact[] = [
  {
    id: 1,
    name: "김민수",
    relation: "아들",
    phone: "010-28**-10**",
    emoji: "👨🏻",
  },
  {
    id: 2,
    name: "이정희",
    relation: "딸",
    phone: "010-73**-42**",
    emoji: "👩🏻",
  },
];

const announcements: Announcement[] = [
  {
    id: 1,
    category: "점검 안내",
    title: "7월 정기 서비스 점검 안내",
    summary: "7월 8일 새벽 2시부터 4시까지 서비스 이용이 잠시 제한됩니다.",
    content:
      "더 안정적인 서비스 제공을 위해 7월 8일(수) 오전 2시부터 오전 4시까지 정기 점검을 진행합니다. 점검 중에는 로그인, AI 대화와 기록 조회가 일시적으로 제한될 수 있습니다.",
    date: "2026.07.03",
    important: true,
  },
  {
    id: 2,
    category: "안전 안내",
    title: "건강 리포트 이용 시 꼭 확인해 주세요",
    summary:
      "건강 리포트는 생활 관리를 위한 참고 정보이며 의료진의 진단을 대신하지 않습니다.",
    content:
      "건강 리포트는 대화와 생활 기록을 바탕으로 제공되는 참고 정보입니다. 몸이 불편하거나 이상 증상이 계속되면 가까운 의료기관에 전화해 진료를 예약하고, 응급 상황에는 즉시 119에 연락해 주세요.",
    date: "2026.07.02",
    important: true,
  },
  {
    id: 3,
    category: "업데이트",
    title: "일정 직접 등록과 데일리노트 코멘트 기능 추가",
    summary:
      "캘린더에 일정을 직접 등록하고 가족과 노트 코멘트를 나눌 수 있습니다.",
    content:
      "일정 캘린더에서 날짜와 내용을 선택해 일정을 직접 등록할 수 있습니다. 데일리노트 상세 화면에서는 연결된 사용자와 보호자가 코멘트를 남기고 알림을 주고받을 수 있습니다.",
    date: "2026.07.01",
  },
];

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeTab = location.pathname
    .split("/")
    .filter(Boolean)[1] as ServiceTab;
  const activeTab = navItems.some((item) => item.id === routeTab)
    ? routeTab
    : "home";
  const [session, setSession] = useState<Session>(() =>
    loadStored("ansimSession", {
      id: "demo",
      name: "김순자",
      phone: "01012345678",
    }),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    (() => {
      const savedMessages = loadStored<ChatMessage[]>("ansimMessages", []);
      return savedMessages.length <= 1 ? initialMessages : savedMessages;
    })(),
  );
  const [notes, setNotes] = useState<DailyNote[]>(() =>
    loadStored<DailyNote[]>("ansimNotes", initialNotes).map((note) =>
      note.title === "AI 파트너와 나눈 오늘의 이야기"
        ? { ...note, title: "오늘의 이야기" }
        : note,
    ),
  );
  const [chapters, setChapters] = useState<BiographyChapter[]>(() =>
    loadStored("ansimChapters", initialChapters),
  );
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() =>
    loadStored("ansimSchedules", initialSchedules),
  );
  const [toast, setToast] = useState<Toast | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportCallOpen, setSupportCallOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadStored("ansimNotifications", [
      {
        id: 1,
        message: "이번 주 건강 리포트가 완성되었어요.",
        createdAt: "오늘",
        tab: "health",
      },
    ]),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    loadStored("ansimNotificationsEnabled", true),
  );
  const isGuardian = session.accountType === "guardian";
  const isAdmin = session.accountType === "admin";
  const hasLinkedParent = Boolean(session.parentName);
  const subjectName = session.parentName || "피보호인";
  // 사용자 계정과, 그 사람을 돌보는 보호자 계정이 같은 피보호인의 병원 목록·건강 기록을
  // 공유하도록 피보호인 본인의 전화번호를 공용 키로 사용합니다.
  const careGroupKey = isGuardian
    ? normalizePhone(session.parentPhone ?? session.id)
    : normalizePhone(session.phone) || session.id;
  const visibleNavItems = isGuardian
    ? navItems.filter((item) =>
        (hasLinkedParent
          ? ["home", "notes", "calendar", "health", "mypage"]
          : ["home", "mypage"]
        ).includes(item.id),
      )
    : navItems.filter((item) => item.id !== "admin" || isAdmin);
  const visibleNotifications = notifications.filter(
    (notification) =>
      !notification.targetRole ||
      notification.targetRole === (isGuardian ? "guardian" : "user"),
  );

  useEffect(
    () => localStorage.setItem("ansimMessages", JSON.stringify(messages)),
    [messages],
  );
  useEffect(
    () => localStorage.setItem("ansimNotes", JSON.stringify(notes)),
    [notes],
  );
  useEffect(
    () => localStorage.setItem("ansimChapters", JSON.stringify(chapters)),
    [chapters],
  );
  useEffect(
    () => localStorage.setItem("ansimSchedules", JSON.stringify(schedules)),
    [schedules],
  );
  useEffect(
    () =>
      localStorage.setItem("ansimNotifications", JSON.stringify(notifications)),
    [notifications],
  );
  useEffect(
    () =>
      localStorage.setItem(
        "ansimNotificationsEnabled",
        JSON.stringify(notificationsEnabled),
      ),
    [notificationsEnabled],
  );
  useEffect(() => {
    if (
      isGuardian &&
      !hasLinkedParent &&
      !["home", "mypage"].includes(activeTab)
    ) {
      navigate("/dashboard/mypage", { replace: true });
    }
  }, [activeTab, hasLinkedParent, isGuardian, navigate]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 오늘 일정 중 시간이 된(복약, 병원, 치료 등) 항목을 실시간으로 알려줍니다.
  const notifiedScheduleIdsRef = useRef<Set<number>>(
    new Set(loadStored<number[]>("ansimNotifiedScheduleIds", [])),
  );
  useEffect(() => {
    if (!notificationsEnabled) return;
    const checkDueSchedules = () => {
      const due = findDueSchedules(schedules, notifiedScheduleIdsRef.current);
      if (due.length === 0) return;
      for (const schedule of due) notifiedScheduleIdsRef.current.add(schedule.id);
      localStorage.setItem(
        "ansimNotifiedScheduleIds",
        JSON.stringify([...notifiedScheduleIdsRef.current]),
      );
      setNotifications((value) => [
        ...due.map((schedule) => ({
          id: Date.now() + schedule.id,
          message: scheduleReminderMessage(schedule),
          createdAt: "방금",
          tab: "calendar" as const,
        })),
        ...value,
      ]);
    };
    checkDueSchedules();
    const interval = window.setInterval(checkDueSchedules, 60_000);
    return () => window.clearInterval(interval);
  }, [schedules, notificationsEnabled]);

  const go = (tab: ServiceTab) => navigate(`/dashboard/${tab}`);

  const saveProfile = (next: Session) => {
    setSession(next);
    localStorage.setItem("ansimSession", JSON.stringify(next));
    setToast({ message: "내 정보가 안전하게 저장되었어요.", tone: "green" });
  };

  const addNotification = (message: string, tab: ServiceTab = "notes") => {
    setNotifications((value) => [
      {
        id: Date.now(),
        message,
        createdAt: "방금",
        tab,
        targetRole: isGuardian ? "user" : "guardian",
      },
      ...value,
    ]);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="flex h-[76px] items-center px-4 lg:px-7">
          <button
            onClick={() => go("home")}
            className="flex w-64 items-center gap-3 text-left"
          >
            <img
              src="/logo.svg"
              alt="담소"
              className="h-11 w-11 rounded-2xl shadow-lg"
            />
            <span>
              <b className="block text-xl font-black tracking-tight">담소</b>
              <small className="font-bold text-slate-400">
                당신의 오늘을 기억해요
              </small>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl hover:bg-slate-200"
                aria-label="알림"
              >
                ♢
                {visibleNotifications.length > 0 && (
                  <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-black text-white">
                    {visibleNotifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-14 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="font-black">새로운 알림</p>
                    <button
                      onClick={() => {
                        const ids = new Set(
                          visibleNotifications.map((item) => item.id),
                        );
                        setNotifications((value) =>
                          value.filter((item) => !ids.has(item.id)),
                        );
                      }}
                      className="text-xs font-bold text-slate-400"
                    >
                      모두 지우기
                    </button>
                  </div>
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {visibleNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          go(notification.tab);
                          setNotificationsOpen(false);
                          setNotifications((value) =>
                            value.filter((item) => item.id !== notification.id),
                          );
                        }}
                        className="w-full rounded-xl bg-blue-50 p-3 text-left text-sm font-bold text-slate-600"
                      >
                        <span className="block leading-5">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[10px] text-blue-600">
                          {notification.createdAt} · 확인하기 →
                        </span>
                      </button>
                    ))}
                    {visibleNotifications.length === 0 && (
                      <p className="py-7 text-center text-sm text-slate-400">
                        새로운 알림이 없어요.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => go("mypage")}
              className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100 sm:pr-4"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-xl">
                👵🏻
              </span>
              <span className="hidden text-left sm:block">
                <b className="block text-sm">{session.name} 님</b>
                <small className="text-slate-400">
                  {isGuardian ? "보호자 계정" : "내 정보 보기"}
                </small>
              </span>
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[76px] z-30 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <nav className="space-y-1.5">
          {visibleNavItems.map((item) => (
            <NavButton
              key={item.id}
              active={activeTab === item.id}
              icon={item.icon}
              label={
                isGuardian && item.id === "notes"
                  ? "피보호인 데일리노트"
                  : isGuardian && item.id === "calendar"
                    ? "피보호인 일정"
                    : isGuardian && item.id === "health"
                      ? "피보호인 건강 리포트"
                      : item.label
              }
              onClick={() => go(item.id)}
            />
          ))}
        </nav>
        <div className="absolute bottom-6 left-4 right-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white shadow-lg shadow-blue-200">
          <p className="text-2xl">☎</p>
          <p className="mt-2 font-black">도움이 필요하세요?</p>
          <p className="mt-1 text-xs text-blue-100">
            담소 고객센터 · 평일 09–18시
          </p>
          <button
            onClick={() => setSupportCallOpen(true)}
            className="mt-3 w-full rounded-xl bg-white/20 py-2 text-sm font-bold hover:bg-white/30"
          >
            0000-0000 연결
          </button>
        </div>
      </aside>

      <main className="pb-28 lg:ml-64 lg:pb-10">
        {activeTab === "home" &&
          (isGuardian ? (
            hasLinkedParent ? (
              <GuardianHomeView
                guardianName={session.name}
                subjectName={subjectName}
                notes={notes}
                notificationCount={visibleNotifications.length}
                go={go}
              />
            ) : (
              <UnlinkedGuardianHome guardianName={session.name} go={go} />
            )
          ) : (
            <HomeView
              name={session.name}
              notes={notes}
              chapterCount={chapters.length}
              notificationCount={visibleNotifications.length}
              go={go}
            />
          ))}
        {activeTab === "home" && <Announcements />}
        {activeTab === "chat" && (
          <ChatView
            messages={messages}
            setMessages={setMessages}
            onCreateNote={(note) => {
              setNotes((value) => [note, ...value]);
              setSchedules((value) => [
                {
                  id: Date.now() + 2,
                  date: new Date().toLocaleDateString("sv-SE"),
                  time: new Date().toLocaleTimeString("ko-KR", {
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                  title: "데일리노트 작성 완료",
                  type: "daily",
                  description: note.content,
                  status: "완료",
                },
                ...value,
              ]);
              setToast({
                message: "오늘 이야기와 일정 기록이 자동으로 저장되었어요.",
                tone: "green",
              });
            }}
          />
        )}
        {activeTab === "notes" && (
          <NotesView
            notes={notes}
            setNotes={setNotes}
            toast={setToast}
            subjectName={isGuardian ? subjectName : undefined}
            readOnly={isGuardian}
            authorName={session.name}
            onNotify={addNotification}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarView
            schedules={schedules}
            setSchedules={setSchedules}
            subjectName={isGuardian ? subjectName : undefined}
            isGuardian={isGuardian}
            toast={setToast}
          />
        )}
        {activeTab === "biography" && (
          <BiographyView
            chapters={chapters}
            setChapters={setChapters}
            noteCount={notes.length}
            toast={setToast}
          />
        )}
        {activeTab === "health" && (
          <HealthView
            toast={setToast}
            subjectName={isGuardian ? subjectName : undefined}
            careGroupKey={careGroupKey}
          />
        )}
        {activeTab === "mypage" && (
          <MyPage
            session={session}
            saveProfile={saveProfile}
            go={go}
            toast={setToast}
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
          />
        )}
        {activeTab === "admin" && isAdmin && <AdminView />}
      </main>

      <nav className="fixed bottom-0 z-40 flex w-full justify-around border-t border-slate-200 bg-white px-1 py-2 lg:hidden">
        {visibleNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold ${activeTab === item.id ? "text-blue-600" : "text-slate-400"}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="truncate">
              {isGuardian && item.id === "notes"
                ? "피보호인 노트"
                : isGuardian && item.id === "calendar"
                  ? "피보호인 일정"
                  : isGuardian && item.id === "health"
                    ? "건강 리포트"
                    : item.label}
            </span>
          </button>
        ))}
      </nav>
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl lg:bottom-8 ${toast.tone === "green" ? "bg-emerald-600" : "bg-slate-900"}`}
        >
          ✓ {toast.message}
        </div>
      )}
      {supportCallOpen && (
        <CallConfirmModal
          title="고객센터로 전화 연결"
          phone="0000-0000"
          description="담소 고객센터로 전화를 연결하시겠습니까?"
          note="상담 시간 · 평일 09:00–18:00"
          onClose={() => setSupportCallOpen(false)}
          onConfirm={() => {
            setSupportCallOpen(false);
            window.location.href = "tel:00000000";
          }}
        />
      )}
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left font-extrabold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg ${active ? "bg-blue-600 text-white" : "bg-slate-100"}`}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function Page({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1400px] p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        {" "}
        <div>
          {eyebrow && (
            <p className="mb-2 text-sm font-black text-blue-600">{eyebrow}</p>
          )}
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Announcements() {
  const [selected, setSelected] = useState<Announcement | null>(null);
  return (
    <section className="mx-auto max-w-[1400px] px-5 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black text-blue-600">DAMSO NOTICE</p>
            <h2 className="mt-1 text-xl font-black">공지사항</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
            조회 전용
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {announcements.map((notice) => (
            <button
              key={notice.id}
              onClick={() => setSelected(notice)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 sm:px-6"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${notice.important ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
              >
                {notice.category}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm text-slate-800">
                  {notice.title}
                </b>
                <span className="mt-1 hidden truncate text-xs text-slate-400 sm:block">
                  {notice.summary}
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {notice.date}
              </span>
              <span className="text-slate-300">›</span>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${selected.important ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
          >
            {selected.category}
          </span>
          <h2 className="mt-4 text-2xl font-black">{selected.title}</h2>
          <p className="mt-2 text-sm font-bold text-slate-400">
            {selected.date} · 담소 운영팀
          </p>
          <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
            {selected.content}
          </p>
          <button
            onClick={() => setSelected(null)}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-black text-white"
          >
            확인
          </button>
        </Modal>
      )}
    </section>
  );
}

function UnlinkedGuardianHome({
  guardianName,
  go,
}: {
  guardianName: string;
  go: (tab: ServiceTab) => void;
}) {
  return (
    <Page
      eyebrow="보호자 안심 홈"
      title={`${guardianName} 님, 환영합니다`}
      description="피보호인 계정을 연결하면 일상과 건강 상태를 확인할 수 있어요."
    >
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-blue-200 bg-white p-8 text-center shadow-xl shadow-blue-100 sm:p-12">
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-5xl">
          🔗
        </span>
        <span className="mt-6 inline-flex rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
          피보호인 미연동
        </span>
        <h2 className="mt-4 text-3xl font-black">
          피보호인 계정을 연결해 주세요
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-8 text-slate-500">
          피보호인의 성함, 주민등록번호와 전화번호로 사용자 계정을 인증하면
          데일리노트, 일정과 건강 리포트를 보호자 권한으로 볼 수 있습니다.
        </p>
        <button
          onClick={() => go("mypage")}
          className="mt-7 rounded-2xl bg-blue-600 px-7 py-4 font-black text-white shadow-lg shadow-blue-200"
        >
          피보호인 계정 연동하기
        </button>
        <p className="mt-4 text-xs font-bold text-slate-400">
          마이페이지에서 언제든지 연결할 수 있어요.
        </p>
      </section>
    </Page>
  );
}

function GuardianHomeView({
  guardianName,
  subjectName,
  notes,
  notificationCount,
  go,
}: {
  guardianName: string;
  subjectName: string;
  notes: DailyNote[];
  notificationCount: number;
  go: (tab: ServiceTab) => void;
}) {
  return (
    <Page
      eyebrow="보호자 안심 홈"
      title={`${guardianName} 님, ${subjectName}님의 오늘이에요`}
      description="연결된 피보호인의 일상 기록과 건강 변화를 한눈에 확인하세요."
    >
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-7 text-white shadow-xl shadow-blue-200 sm:p-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">
              👵🏻
            </span>
            <div>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-100">
                ● 안전하게 연결됨
              </span>
              <h2 className="mt-3 text-3xl font-black">{subjectName} 님</h2>
              <p className="mt-1 text-blue-100">
                오늘 오전 8:35 마지막 활동 확인
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <b className="block text-xl">86점</b>
              <span className="text-xs text-blue-100">안심 지수</span>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <b className="block text-xl">6,240</b>
              <span className="text-xs text-blue-100">오늘 걸음</span>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <b className="block text-xl">정상</b>
              <span className="text-xs text-blue-100">복약 상태</span>
            </div>
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <button
          onClick={() => go("notes")}
          className="group rounded-[1.75rem] border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
            ▤
          </span>
          <p className="mt-5 text-sm font-black text-amber-600">
            피보호인 기록
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {subjectName}님의 데일리노트
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            도담과 나눈 오늘의 이야기와 하루 기록을 확인할 수 있어요.
          </p>
          <span className="mt-5 inline-flex font-black text-blue-600">
            최근 기록 {notes.length}개 보기 →
          </span>
        </button>
        <button
          onClick={() => go("health")}
          className="group rounded-[1.75rem] border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-600">
            ♡
          </span>
          <p className="mt-5 text-sm font-black text-rose-600">AI 건강 분석</p>
          <h2 className="mt-1 text-2xl font-black">
            {subjectName}님의 건강 리포트
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            혈압, 수면, 활동량과 복약 상태의 변화를 확인할 수 있어요.
          </p>
          <span className="mt-5 inline-flex font-black text-blue-600">
            이번 주 리포트 보기 →
          </span>
        </button>
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">최근 데일리노트</h2>
            <button
              onClick={() => go("notes")}
              className="text-sm font-black text-blue-600"
            >
              전체 보기 →
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {notes.slice(0, 2).map((note) => (
              <button
                key={note.id}
                onClick={() => go("notes")}
                className="flex w-full items-center gap-4 rounded-xl bg-slate-50 p-4 text-left"
              >
                <span className="text-2xl">
                  {note.mood === "행복해요" ? "😊" : "🌿"}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{note.title}</b>
                  <span className="mt-1 block text-xs text-slate-400">
                    {note.date} · {note.mood}
                  </span>
                </span>
                <span className="text-slate-300">›</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-black text-amber-700">
            새 건강 알림 {notificationCount}건
          </p>
          <h2 className="mt-2 text-xl font-black">정기 검진 시기예요</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            혈압은 안정적이지만 마지막 검진 후 6개월이 지났어요.
          </p>
          <button
            onClick={() => go("health")}
            className="mt-5 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white"
          >
            내용 확인하기
          </button>
        </div>
      </section>
    </Page>
  );
}

function CalendarView({
  schedules,
  setSchedules,
  subjectName,
  isGuardian,
  toast,
}: {
  schedules: ScheduleEvent[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
  subjectName?: string;
  isGuardian: boolean;
  toast: (toast: Toast) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(new Date(2026, 6, 1));
  const [selectedDate, setSelectedDate] = useState("2026-07-02");
  const todayISO = new Date().toLocaleDateString("sv-SE");
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [adding, setAdding] = useState(false);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const rawDay = index - firstDay + 1;
    const cellDate =
      rawDay < 1
        ? new Date(year, month - 1, previousMonthDays + rawDay)
        : rawDay > daysInMonth
          ? new Date(year, month + 1, rawDay - daysInMonth)
          : new Date(year, month, rawDay);
    return {
      date: cellDate.toLocaleDateString("sv-SE"),
      day: cellDate.getDate(),
      currentMonth: cellDate.getMonth() === month,
    };
  });
  const selectedSchedules = schedules
    .filter((schedule) => schedule.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcomingSchedules = [...schedules]
    .filter((schedule) => schedule.status === "예정")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 4);
  const typeStyle: Record<
    ScheduleEvent["type"],
    { label: string; dot: string; card: string; icon: string }
  > = {
    hospital: {
      label: "병원 예약",
      dot: "bg-rose-500",
      card: "bg-rose-50 text-rose-700",
      icon: "🏥",
    },
    medication: {
      label: "복약",
      dot: "bg-blue-500",
      card: "bg-blue-50 text-blue-700",
      icon: "💊",
    },
    treatment: {
      label: "치료",
      dot: "bg-violet-500",
      card: "bg-violet-50 text-violet-700",
      icon: "🩺",
    },
    daily: {
      label: "일상 기록",
      dot: "bg-emerald-500",
      card: "bg-emerald-50 text-emerald-700",
      icon: "📘",
    },
    personal: {
      label: "직접 등록",
      dot: "bg-cyan-500",
      card: "bg-cyan-50 text-cyan-700",
      icon: "✎",
    },
  };
  const selectedDateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${selectedDate}T00:00:00`));

  return (
    <Page
      eyebrow={isGuardian ? "피보호인 일정 관리" : "나의 일정 관리"}
      title={subjectName ? `${subjectName}님의 일정 캘린더` : "일정 캘린더"}
      description="자동으로 기록된 일정과 직접 등록한 일정을 날짜별로 관리하세요."
      action={
        <button
          onClick={() => setAdding(true)}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"
        >
          ＋ 일정 직접 등록
        </button>
      }
    >
      {isGuardian && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">
            👵🏻
          </span>
          <div>
            <p className="text-sm font-black">{subjectName} 님의 공유 일정</p>
            <p className="mt-1 text-xs text-slate-500">
              피보호인이 동의한 건강·생활 일정만 안전하게 표시됩니다.
            </p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
            연결됨
          </span>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
            <button
              onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl"
            >
              ‹
            </button>
            <h2 className="text-xl font-black">
              {year}년 {month + 1}월
            </h2>
            <button
              onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
              <div
                key={day}
                className={`py-3 text-center text-xs font-black ${index === 0 ? "text-rose-500" : index === 6 ? "text-blue-500" : "text-slate-500"}`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const daySchedules = schedules.filter(
                (schedule) => schedule.date === cell.date,
              );
              const selected = selectedDate === cell.date;
              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`min-h-20 border-b border-r border-slate-100 p-1.5 text-left transition sm:min-h-24 sm:p-2 ${selected ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : "hover:bg-slate-50"} ${cell.currentMonth ? "" : "bg-slate-50/50 text-slate-300"}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${cell.date === todayISO ? "bg-blue-600 text-white" : ""}`}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {daySchedules.slice(0, 3).map((schedule) => (
                      <span
                        key={schedule.id}
                        title={schedule.title}
                        className={`h-2 w-2 rounded-full ${typeStyle[schedule.type].dot}`}
                      />
                    ))}
                  </div>
                  {daySchedules.length > 0 && (
                    <p className="mt-1 hidden truncate text-[10px] font-bold text-slate-500 sm:block">
                      {daySchedules[0].title}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 p-4 text-xs font-bold text-slate-500">
            {Object.values(typeStyle).map((style) => (
              <span key={style.label} className="flex items-center gap-1.5">
                <i className={`h-2 w-2 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-blue-600">선택한 날짜</p>
            <h2 className="mt-1 text-xl font-black">{selectedDateLabel}</h2>
            <div className="mt-5 space-y-3">
              {selectedSchedules.map((schedule) => {
                const style = typeStyle[schedule.type];
                return (
                  <button
                    key={schedule.id}
                    onClick={() => setSelectedEvent(schedule)}
                    className="flex w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left hover:bg-slate-100"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.card}`}
                    >
                      {style.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-xs font-black text-slate-400">
                        {schedule.time} · {style.label}
                      </span>
                      <b className="mt-1 block text-sm">{schedule.title}</b>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${schedule.status === "완료" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {schedule.status}
                      </span>
                    </span>
                    <span className="text-slate-300">›</span>
                  </button>
                );
              })}
              {selectedSchedules.length === 0 && (
                <div className="rounded-2xl bg-slate-50 py-9 text-center">
                  <p className="text-3xl">☕</p>
                  <p className="mt-2 text-sm font-bold text-slate-400">
                    등록된 일정이 없어요
                  </p>
                </div>
              )}
            </div>
          </section>
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">다가오는 일정</h2>
            <div className="mt-4 space-y-3">
              {upcomingSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => {
                    setSelectedDate(schedule.date);
                    setVisibleMonth(new Date(`${schedule.date}T00:00:00`));
                    setSelectedEvent(schedule);
                  }}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={`h-3 w-3 rounded-full ${typeStyle[schedule.type].dot}`}
                  />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{schedule.title}</b>
                    <span className="text-xs text-slate-400">
                      {schedule.date.replaceAll("-", ".")} · {schedule.time}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {selectedEvent && (
        <Modal onClose={() => setSelectedEvent(null)}>
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${typeStyle[selectedEvent.type].card}`}
          >
            {typeStyle[selectedEvent.type].icon}
          </span>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-black text-blue-600">
              {typeStyle[selectedEvent.type].label}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black ${selectedEvent.status === "완료" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              {selectedEvent.status}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black">{selectedEvent.title}</h2>
          <p className="mt-3 font-bold text-slate-500">
            {selectedEvent.date.replaceAll("-", ".")} · {selectedEvent.time}
          </p>
          {selectedEvent.location && (
            <p className="mt-2 text-sm font-bold text-slate-500">
              ⌖ {selectedEvent.location}
            </p>
          )}
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-black text-slate-400">
              {selectedEvent.type === "daily"
                ? "일상 기록 내용"
                : selectedEvent.status === "완료"
                  ? "진행 및 치료 기록"
                  : "일정 안내"}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {selectedEvent.description}
            </p>
          </div>
          {isGuardian && (
            <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-700">
              보호자 권한으로 열람 중입니다. 일정 변경은 피보호인과 확인 후
              진행해 주세요.
            </p>
          )}
          <button
            onClick={() => setSelectedEvent(null)}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-black text-white"
          >
            확인
          </button>
        </Modal>
      )}
      {adding && (
        <ScheduleForm
          initialDate={selectedDate}
          onClose={() => setAdding(false)}
          onSave={(schedule) => {
            setSchedules((value) => [schedule, ...value]);
            setSelectedDate(schedule.date);
            setVisibleMonth(new Date(`${schedule.date}T00:00:00`));
            setAdding(false);
            toast({ message: "일정이 캘린더에 등록되었어요.", tone: "green" });
          }}
        />
      )}
    </Page>
  );
}

function ScheduleForm({
  initialDate,
  onClose,
  onSave,
}: {
  initialDate: string;
  onClose: () => void;
  onSave: (schedule: ScheduleEvent) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("09:00");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!date || !time || !title.trim()) {
      setError("날짜, 시간과 일정 제목을 입력해 주세요.");
      return;
    }
    onSave({
      id: Date.now(),
      date,
      time: toKoreanTimeLabel(time),
      title: title.trim(),
      type: "personal",
      description: description.trim() || "직접 등록한 일정입니다.",
      location: location.trim() || undefined,
      status: "예정",
    });
  };
  const fieldClass =
    "h-12 w-full rounded-xl border-2 border-slate-200 px-4 font-bold outline-none focus:border-blue-500";
  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-black">일정 직접 등록</h2>
      <p className="mt-2 text-sm text-slate-500">
        기억할 일정을 캘린더에 직접 추가해 보세요.
      </p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-2 block text-sm font-black">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-black">시간</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-black">일정 제목</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="예: 가족과 저녁 식사"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black">장소 (선택)</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="장소를 입력하세요"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black">메모 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="일정에 필요한 내용을 적어주세요"
            className="w-full resize-none rounded-xl border-2 border-slate-200 p-4 font-medium outline-none focus:border-blue-500"
          />
        </label>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
          >
            취소
          </button>
          <button className="flex-1 rounded-xl bg-blue-600 py-3 font-black text-white">
            일정 등록
          </button>
        </div>
      </form>
    </Modal>
  );
}

function HomeView({
  name,
  notes,
  chapterCount,
  notificationCount,
  go,
}: {
  name: string;
  notes: DailyNote[];
  chapterCount: number;
  notificationCount: number;
  go: (tab: ServiceTab) => void;
}) {
  return (
    <Page
      eyebrow="2026년 7월 2일 목요일"
      title={`${name} 님, 오늘도 반가워요`}
      description="오늘의 이야기를 나누면 담소가 소중한 기록으로 남겨드려요."
    >
      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <button
          onClick={() => go("chat")}
          className="group relative min-h-72 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-7 text-left text-white shadow-xl shadow-blue-200 sm:p-9"
        >
          <span className="absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/10" />
          <span className="absolute bottom-[-4rem] right-24 h-40 w-40 rounded-full bg-cyan-300/10" />
          <div className="relative">
            <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-black">
              ✦ 나의 AI 파트너 · 도담
            </span>
            <h2 className="mt-7 text-3xl font-black leading-tight sm:text-4xl">
              오늘 하루는
              <br />
              어떠셨나요?
            </h2>
            <p className="mt-3 max-w-md text-blue-100">
              말로 편하게 들려주셔도, 글로 적어주셔도 좋아요.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-blue-700 transition group-hover:translate-x-1">
              대화 시작하기 <span>→</span>
            </span>
          </div>
        </button>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-400">
                오늘의 안심 지수
              </p>
              <p className="mt-1 text-2xl font-black">건강한 하루예요</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
              😊
            </div>
          </div>
          <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
          </div>
          <p className="mt-2 text-right text-sm font-black text-emerald-600">
            86점 · 양호
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5">
            <MiniStat value="6,240" label="걸음" />
            <MiniStat value="7시간" label="수면" />
            <MiniStat value="정상" label="복약" />
          </div>
          <button
            onClick={() => go("health")}
            className="mt-5 w-full rounded-xl bg-slate-50 py-3 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          >
            건강 리포트 자세히 보기 →
          </button>
        </div>
      </section>
      <section className="mt-7 grid gap-5 md:grid-cols-3">
        <FeatureCard
          color="amber"
          icon="▤"
          label="데일리노트"
          value={`${notes.length}개의 이야기`}
          text="오늘의 기록을 확인해 보세요"
          onClick={() => go("notes")}
        />
        <FeatureCard
          color="violet"
          icon="▥"
          label="나의 자서전"
          value={`${chapterCount}개의 인생 이야기`}
          text="추억이 한 권의 책이 되고 있어요"
          onClick={() => go("biography")}
        />
        <FeatureCard
          color="rose"
          icon="♡"
          label="맞춤형 케어"
          value={`건강 알림 ${notificationCount}건`}
          text="정기 검진을 확인해 주세요"
          onClick={() => go("health")}
        />
      </section>
      <section className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">최근 데일리노트</h2>
            <p className="mt-1 text-sm text-slate-400">
              AI 파트너와 나눈 이야기로 만들었어요
            </p>
          </div>
          <button
            onClick={() => go("notes")}
            className="text-sm font-black text-blue-600"
          >
            모두 보기 →
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {notes.slice(0, 3).map((note) => (
            <button
              key={note.id}
              onClick={() => go("notes")}
              className="rounded-2xl bg-slate-50 p-5 text-left transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="text-xs font-black text-blue-600">{note.date}</p>
              <p className="mt-2 font-black">{note.title}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                {note.content}
              </p>
            </button>
          ))}
        </div>
      </section>
    </Page>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <b className="block text-base">{value}</b>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function FeatureCard({
  color,
  icon,
  label,
  value,
  text,
  onClick,
}: {
  color: string;
  icon: string;
  label: string;
  value: string;
  text: string;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${colors[color]}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black text-slate-400">{label}</span>
        <b className="mt-1 block text-lg">{value}</b>
        <span className="mt-1 block truncate text-xs text-slate-400">
          {text}
        </span>
      </span>
      <span className="ml-auto text-slate-300 group-hover:text-blue-500">
        ›
      </span>
    </button>
  );
}

function ChatView({
  messages,
  setMessages,
  onCreateNote,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onCreateNote: (note: DailyNote) => void;
}) {
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const stored = loadStored<ChatThread[]>("ansimChatThreads", []);
    return stored.length > 0
      ? stored
      : [
          {
            id: "initial",
            title: "오늘의 대화",
            createdAt: "7월 2일",
            messages,
          },
        ];
  });
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const storedId = localStorage.getItem("ansimActiveChatThreadId");
    return storedId && threads.some((thread) => thread.id === storedId)
      ? storedId
      : threads[0].id;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    // 현재 활성 스레드에 최신 messages를 반영해 로컬 스토리지 저장 대상과 동기화합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThreads((value) =>
      value.map((thread) =>
        thread.id === activeThreadId ? { ...thread, messages } : thread,
      ),
    );
  }, [activeThreadId, messages]);
  useEffect(
    () => localStorage.setItem("ansimChatThreads", JSON.stringify(threads)),
    [threads],
  );
  useEffect(
    () => localStorage.setItem("ansimActiveChatThreadId", activeThreadId),
    [activeThreadId],
  );

  const send = (text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
    });
    setMessages((value) => [
      ...value,
      { id: Date.now(), role: "user", text: text.trim(), time: now },
    ]);
    setInput("");
    window.setTimeout(
      () =>
        setMessages((value) => [
          ...value,
          {
            id: Date.now() + 1,
            role: "ai",
            text: "그런 일이 있으셨군요. 말씀해 주셔서 고마워요. 그때 마음은 어떠셨는지, 몸이 불편한 곳은 없었는지도 들려주실래요?",
            time: now,
          },
        ]),
      550,
    );
  };
  const toggleRecording = () => {
    if (recording) {
      setRecording(false);
      send(
        "오늘 공원에서 오랜 친구를 만나 함께 산책했어. 기분이 참 좋았고 몸도 가벼웠어.",
      );
      return;
    }
    setSeconds(0);
    setRecording(true);
  };
  const createNote = () => {
    const userStories = messages
      .filter((m) => m.role === "user")
      .map((m) => m.text);
    const content = userStories.length
      ? userStories.join(" ")
      : "AI 파트너와 오늘 하루의 안부를 나누었다. 차분히 대화를 나누며 마음을 돌아본 시간이었다.";
    onCreateNote({
      id: Date.now(),
      date: todayKorean(),
      title: "오늘의 이야기",
      content,
      mood: "편안해요",
      tags: ["AI 대화", "오늘", "기록"],
      health: "대화 기반 분석 · 특이사항 없음",
    });
    setSaved(true);
  };
  const openThread = (thread: ChatThread) => {
    setActiveThreadId(thread.id);
    setMessages(thread.messages);
    setSaved(false);
    setInput("");
  };
  const createNewThread = () => {
    const now = new Date();
    const id = String(now.getTime());
    const starterMessages: ChatMessage[] = [
      {
        id: now.getTime() + 1,
        role: "ai",
        text: "새로운 대화를 시작할게요. 순자님, 지금 가장 먼저 나누고 싶은 이야기는 무엇인가요?",
        time: now.toLocaleTimeString("ko-KR", {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
    ];
    const newThread: ChatThread = {
      id,
      title: `새 대화 ${threads.length + 1}`,
      createdAt: now.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      }),
      messages: starterMessages,
    };
    setThreads((value) => [...value, newThread]);
    setActiveThreadId(id);
    setMessages(starterMessages);
    setSaved(false);
    setInput("");
  };
  return (
    <div className="flex h-[calc(100vh-76px)] flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-2xl">
            🌼
            <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <div className="ml-3">
            <h1 className="font-black">AI 파트너 · 도담</h1>
            <p className="text-xs font-bold text-emerald-600">
              ● 지금 함께하고 있어요
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={createNewThread}
              className="rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-50 sm:px-4 sm:text-sm"
            >
              ＋ 새 대화
            </button>
            <button
              onClick={createNote}
              disabled={saved}
              className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 disabled:bg-emerald-50 disabled:text-emerald-600 sm:px-4 sm:text-sm"
            >
              {saved ? "✓ 노트 저장 완료" : "대화내용 노트정리"}
            </button>
          </div>
        </div>
      </div>
      <div className="border-b border-slate-200 bg-white px-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto pt-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => openThread(thread)}
              className={`group shrink-0 rounded-t-xl border-b-2 px-4 py-3 text-left transition ${activeThreadId === thread.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-transparent text-slate-400 hover:bg-slate-50"}`}
            >
              <b className="block text-xs sm:text-sm">{thread.title}</b>
              <span className="mt-0.5 block text-[10px] font-bold opacity-70">
                {thread.createdAt} ·{" "}
                {
                  thread.messages.filter((message) => message.role === "user")
                    .length
                }
                개 이야기
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7 text-center">
            <span className="rounded-full bg-slate-200/70 px-4 py-1.5 text-xs font-bold text-slate-500">
              오늘
            </span>
          </div>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-5 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "ai" && (
                <span className="mr-2 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  🌼
                </span>
              )}
              <div
                className={`max-w-[78%] sm:max-w-[65%] ${message.role === "user" ? "text-right" : ""}`}
              >
                <div
                  className={`inline-block rounded-2xl px-5 py-3 text-left text-sm font-medium leading-7 shadow-sm ${message.role === "user" ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-100 bg-white text-slate-700"}`}
                >
                  {message.text}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {message.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-5xl">
          {messages.length < 3 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 p-2 focus-within:border-blue-400"
          >
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl text-white ${recording ? "animate-pulse bg-red-500" : "bg-blue-600"}`}
            >
              {recording ? "■" : "●"}
            </button>
            <div className="min-w-0 flex-1">
              {recording && (
                <p className="px-2 text-xs font-black text-red-500">
                  음성을 듣고 있어요 · 00:{seconds.toString().padStart(2, "0")}
                </p>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                placeholder="도담에게 오늘 이야기를 들려주세요..."
                className="max-h-28 w-full resize-none bg-transparent px-2 py-3 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
            >
              ➤
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            대화 내용은 안전하게 보호되며, 데일리노트 작성에만 사용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotesView({
  notes,
  setNotes,
  toast,
  subjectName,
  readOnly = false,
  authorName,
  onNotify,
}: {
  notes: DailyNote[];
  setNotes: React.Dispatch<React.SetStateAction<DailyNote[]>>;
  toast: (toast: Toast) => void;
  subjectName?: string;
  readOnly?: boolean;
  authorName: string;
  onNotify: (message: string, tab?: ServiceTab) => void;
}) {
  const [selected, setSelected] = useState<DailyNote | null>(null);
  const [shareNote, setShareNote] = useState<DailyNote | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "가족" | "건강">("all");
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const commentSubmittingRef = useRef(false);
  const familyNoteCount = notes.filter((note) => note.tags.includes("가족")).length;
  const healthNoteCount = notes.filter((note) => note.tags.includes("건강")).length;
  const filtered = notes.filter((note) => {
    const matchesCategory = category === "all" || note.tags.includes(category);
    const matchesQuery = `${note.title}${note.content}${note.tags.join("")}`.includes(
      query,
    );
    return matchesCategory && matchesQuery;
  });
  const addComment = () => {
    if (!selected || !commentText.trim() || commentSubmittingRef.current)
      return;
    commentSubmittingRef.current = true;
    const comment: NoteComment = {
      id: Date.now(),
      author: authorName,
      role: readOnly ? "guardian" : "user",
      text: commentText.trim(),
      createdAt: new Date().toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    };
    const updated = {
      ...selected,
      comments: [...(selected.comments ?? []), comment],
    };
    setNotes((value) =>
      value.map((note) => (note.id === selected.id ? updated : note)),
    );
    setSelected(updated);
    setCommentText("");
    const target = readOnly ? (subjectName ?? "사용자") : "보호자";
    onNotify(
      `${authorName}님이 ‘${selected.title}’에 코멘트를 남겼어요.`,
      "notes",
    );
    toast({ message: `${target}에게 코멘트 알림을 보냈어요.`, tone: "green" });
    window.setTimeout(() => {
      commentSubmittingRef.current = false;
    }, 100);
  };
  const updateComment = (commentId: number) => {
    if (!selected || !editingCommentText.trim()) return;
    const updated = {
      ...selected,
      comments: (selected.comments ?? []).map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              text: editingCommentText.trim(),
              createdAt: `${comment.createdAt.replace(" · 수정됨", "")} · 수정됨`,
            }
          : comment,
      ),
    };
    setNotes((value) =>
      value.map((note) => (note.id === selected.id ? updated : note)),
    );
    setSelected(updated);
    setEditingCommentId(null);
    setEditingCommentText("");
    toast({ message: "코멘트를 수정했어요.", tone: "green" });
  };
  const deleteComment = (commentId: number) => {
    if (!selected || !window.confirm("이 코멘트를 삭제할까요?")) return;
    const updated = {
      ...selected,
      comments: (selected.comments ?? []).filter(
        (comment) => comment.id !== commentId,
      ),
    };
    setNotes((value) =>
      value.map((note) => (note.id === selected.id ? updated : note)),
    );
    setSelected(updated);
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditingCommentText("");
    }
    toast({ message: "코멘트를 삭제했어요.", tone: "green" });
  };
  return (
    <Page
      eyebrow={readOnly ? "피보호인 하루 기록" : "나의 하루 기록"}
      title={subjectName ? `${subjectName}님의 데일리노트` : "데일리노트"}
      description={
        readOnly
          ? "피보호인의 하루를 확인하고 따뜻한 코멘트와 알림을 남겨보세요."
          : "하루 기록을 살펴보고 연결된 보호자와 코멘트를 나눠보세요."
      }
      action={
        <div className="relative">
          <span className="absolute left-4 top-3 text-slate-400">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기록 검색"
            className="h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-black">기록 모아보기</p>
          <div className="mt-4 space-y-2 text-sm font-bold">
            <button
              onClick={() => setCategory("all")}
              className={`flex w-full justify-between rounded-xl px-3 py-2.5 transition ${
                category === "all"
                  ? "bg-blue-50 text-blue-700"
                  : "px-3 py-2 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>전체 기록</span>
              <span>{notes.length}</span>
            </button>
            <button
              onClick={() => setCategory("가족")}
              className={`flex w-full justify-between rounded-xl px-3 py-2.5 transition ${
                category === "가족"
                  ? "bg-blue-50 text-blue-700"
                  : "px-3 py-2 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>가족 이야기</span>
              <span>{familyNoteCount}</span>
            </button>
            <button
              onClick={() => setCategory("건강")}
              className={`flex w-full justify-between rounded-xl px-3 py-2.5 transition ${
                category === "건강"
                  ? "bg-blue-50 text-blue-700"
                  : "px-3 py-2 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>건강 기록</span>
              <span>{healthNoteCount}</span>
            </button>
          </div>
          <div className="mt-6 rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-black text-amber-700">이번 달 기록</p>
            <p className="mt-1 text-2xl font-black">12일</p>
            <p className="text-xs text-slate-500">꾸준히 기록 중이에요!</p>
          </div>
        </aside>
        <div className="space-y-4">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="group rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <b className="text-xl">
                    {note.date.match(/\d{2}(?=\.)/g)?.at(-1)}
                  </b>
                  <span className="text-[10px] font-black">JUL</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black text-slate-400">
                      {note.date}
                    </p>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">
                      {note.mood}
                    </span>
                    {(note.comments?.length ?? 0) > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600">
                        코멘트 {note.comments?.length}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-black">{note.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {note.content}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    onClick={() => {
                      setSelected(note);
                      setCommentText("");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  >
                    읽기·코멘트
                  </button>
                  <button
                    onClick={() => setShareNote(note)}
                    className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                  >
                    가족 알림
                  </button>
                </div>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl bg-white p-12 text-center text-slate-400">
              찾으시는 기록이 없어요.
            </div>
          )}
        </div>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <p className="text-sm font-black text-blue-600">{selected.date}</p>
          <h2 className="mt-2 text-2xl font-black">{selected.title}</h2>
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-600">
            {selected.content}
          </p>
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            ♡ 건강 메모 · {selected.health}
          </div>
          <section className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black">가족 코멘트</h3>
              <span className="text-xs font-bold text-slate-400">
                {selected.comments?.length ?? 0}개
              </span>
            </div>
            <div className="mt-3 max-h-48 space-y-3 overflow-y-auto">
              {selected.comments?.map((comment) => {
                const canManage =
                  comment.role === (readOnly ? "guardian" : "user") &&
                  comment.author === authorName;
                return (
                  <div
                    key={comment.id}
                    className={`rounded-2xl p-4 ${comment.role === "guardian" ? "bg-blue-50" : "bg-amber-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <b className="text-sm">
                        {comment.author}{" "}
                        <span className="ml-1 text-[10px] text-slate-400">
                          {comment.role === "guardian" ? "보호자" : "사용자"}
                        </span>
                      </b>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {comment.createdAt}
                        </span>
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                              }}
                              className="text-[11px] font-black text-blue-600"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => deleteComment(comment.id)}
                              className="text-[11px] font-black text-red-500"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={editingCommentText}
                          onChange={(event) =>
                            setEditingCommentText(event.target.value)
                          }
                          className="h-10 min-w-0 flex-1 rounded-lg border-2 border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => updateComment(comment.id)}
                          disabled={!editingCommentText.trim()}
                          className="rounded-lg bg-blue-600 px-3 text-xs font-black text-white disabled:bg-slate-300"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentText("");
                          }}
                          className="rounded-lg bg-white px-3 text-xs font-black text-slate-500"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {comment.text}
                      </p>
                    )}
                  </div>
                );
              })}
              {!selected.comments?.length && (
                <p className="rounded-xl bg-slate-50 py-5 text-center text-sm text-slate-400">
                  첫 코멘트를 남겨보세요.
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  if (
                    event.nativeEvent.isComposing ||
                    event.nativeEvent.keyCode === 229
                  )
                    return;
                  event.preventDefault();
                  addComment();
                }}
                placeholder={
                  readOnly
                    ? "피보호인에게 따뜻한 말을 남겨주세요"
                    : "보호자에게 전할 말을 남겨주세요"
                }
                className="h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-4 text-sm font-bold outline-none focus:border-blue-500"
              />
              <button
                onClick={addComment}
                disabled={!commentText.trim()}
                className="rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:bg-slate-300"
              >
                코멘트 등록
              </button>
            </div>
            <p className="mt-2 text-xs font-bold text-blue-600">
              등록하면 연결된 {readOnly ? "사용자" : "보호자"}에게 알림이
              전달됩니다.
            </p>
          </section>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setSelected(null)}
              className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
            >
              닫기
            </button>
            {!readOnly && (
              <button
                onClick={() => {
                  if (window.confirm("이 기록을 삭제할까요?")) {
                    setNotes((value) =>
                      value.filter((n) => n.id !== selected.id),
                    );
                    setSelected(null);
                  }
                }}
                className="rounded-xl px-5 font-black text-red-500"
              >
                삭제
              </button>
            )}
          </div>
        </Modal>
      )}
      {shareNote && (
        <FamilyShareModal
          type="데일리노트"
          title={shareNote.title}
          summary={`${shareNote.mood} · ${shareNote.health}`}
          onClose={() => setShareNote(null)}
          onSent={(names) => {
            setShareNote(null);
            toast({
              message: `${names}에게 데일리노트 알림을 보냈어요.`,
              tone: "green",
            });
          }}
        />
      )}
    </Page>
  );
}

function BiographyView({
  chapters,
  setChapters,
  noteCount,
  toast,
}: {
  chapters: BiographyChapter[];
  setChapters: React.Dispatch<React.SetStateAction<BiographyChapter[]>>;
  noteCount: number;
  toast: (toast: Toast) => void;
}) {
  const [selected, setSelected] = useState<BiographyChapter | null>(null);
  const generate = () => {
    const exists = chapters.some((c) => c.id === 4);
    if (!exists)
      setChapters((value) => [
        ...value,
        {
          id: 4,
          title: "4장 · 다시 피어나는 나의 계절",
          period: "2006 — 오늘",
          summary:
            "데일리노트 속 가족과 친구, 평범해서 더 소중했던 오늘의 순간들을 한 편의 이야기로 엮었습니다.",
          status: "작성 중",
        },
      ]);
    toast({
      message: "최근 기록을 바탕으로 새 장을 만들었어요.",
      tone: "green",
    });
  };
  return (
    <Page
      eyebrow="나의 삶, 한 권의 책"
      title="나의 자서전"
      description="쌓인 데일리노트를 AI가 시대와 주제별로 엮어 인생 이야기로 만들어요."
      action={
        <button
          onClick={generate}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"
        >
          ✦ 새 이야기 만들기
        </button>
      }
    >
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#272343] to-[#493e78] p-7 text-white shadow-xl sm:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_260px]">
          <div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black">
              AI 자서전 프로젝트
            </span>
            <h2 className="mt-6 text-3xl font-black sm:text-4xl">
              김순자의 인생 이야기
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-violet-100">
              바닷가 작은 마을에서 시작해 가족이라는 숲을 이루기까지. 평범한
              날들 속 반짝이는 순간을 오래도록 간직합니다.
            </p>
            <div className="mt-7 flex gap-7">
              <div>
                <b className="text-2xl">{chapters.length}</b>
                <span className="ml-2 text-sm text-violet-200">개의 장</span>
              </div>
              <div>
                <b className="text-2xl">{noteCount}</b>
                <span className="ml-2 text-sm text-violet-200">개의 기록</span>
              </div>
            </div>
          </div>
          <div className="mx-auto h-64 w-44 rotate-3 rounded-r-xl border-l-8 border-amber-800 bg-[#f5e8ca] p-5 text-center text-[#44351f] shadow-2xl">
            <p className="mt-10 font-serif text-sm">나의 이야기</p>
            <div className="mx-auto my-5 h-px w-12 bg-amber-700" />
            <p className="font-serif text-2xl font-black leading-tight">
              꽃피던
              <br />
              모든 날
            </p>
            <p className="mt-8 text-xs">김순자</p>
          </div>
        </div>
      </section>
      <div className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">자서전 목차</h2>
          <span className="text-sm font-bold text-slate-400">
            최근 업데이트 · 오늘
          </span>
        </div>
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setSelected(chapter)}
              className="flex w-full items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-600 sm:flex">
                {chapter.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-xs font-black text-violet-500">
                  {chapter.period}
                </span>
                <b className="mt-1 block text-lg">{chapter.title}</b>
                <span className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {chapter.summary}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${chapter.status === "완성" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
              >
                {chapter.status}
              </span>
              <span className="text-xl text-slate-300">›</span>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <p className="font-black text-violet-600">{selected.period}</p>
          <h2 className="mt-2 text-2xl font-black">{selected.title}</h2>
          <div className="mt-6 rounded-2xl bg-[#fbf8f1] p-6 font-serif text-base leading-8 text-slate-700">
            <p>{selected.summary}</p>
            <p className="mt-4">
              그 시절의 바람과 사람들의 웃음소리는 오랜 시간이 흐른 지금도 마음
              한편에 선명하다. 나의 하루들은 그렇게 서로 이어져 한 사람의 삶이
              되었다.
            </p>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-black text-white"
          >
            책 덮기
          </button>
        </Modal>
      )}
    </Page>
  );
}

function HealthView({
  toast,
  subjectName,
  careGroupKey,
}: {
  toast: (toast: Toast) => void;
  subjectName?: string;
  careGroupKey: string;
}) {
  const [period, setPeriod] = useState("이번 주");
  const [sharing, setSharing] = useState(false);
  const hospitalsKey = `ansimMyHospitals:${careGroupKey}`;
  const healthLogKey = `ansimHealthLog:${careGroupKey}`;
  const [hospitals, setHospitals] = useState<MyHospital[]>(() =>
    loadStored<MyHospital[]>(hospitalsKey, []),
  );
  const [addingHospital, setAddingHospital] = useState(false);
  const [callTarget, setCallTarget] = useState<MyHospital | null>(null);

  useEffect(
    () => localStorage.setItem(hospitalsKey, JSON.stringify(hospitals)),
    [hospitalsKey, hospitals],
  );

  const addHospital = (hospital: Omit<MyHospital, "id">) => {
    setHospitals((value) => [...value, { id: Date.now(), ...hospital }]);
    setAddingHospital(false);
    toast({ message: "병원이 등록되었어요.", tone: "green" });
  };

  const removeHospital = (id: number) => {
    setHospitals((value) => value.filter((hospital) => hospital.id !== id));
  };

  const [healthLog, setHealthLog] = useState<HealthLogEntry[]>(() =>
    loadStored<HealthLogEntry[]>(healthLogKey, []),
  );
  const [addingLog, setAddingLog] = useState(false);

  useEffect(
    () => localStorage.setItem(healthLogKey, JSON.stringify(healthLog)),
    [healthLogKey, healthLog],
  );

  const addHealthLog = (entry: Omit<HealthLogEntry, "id">) => {
    setHealthLog((value) => [{ id: Date.now(), ...entry }, ...value]);
    setAddingLog(false);
    toast({ message: "건강 수치가 기록되었어요.", tone: "green" });
  };

  const removeHealthLog = (id: number) => {
    setHealthLog((value) => value.filter((entry) => entry.id !== id));
  };

  const periodDays: Record<string, number> = {
    "이번 주": 7,
    "지난 4주": 28,
    "최근 3개월": 90,
  };
  const periodCutoff = new Date();
  periodCutoff.setDate(periodCutoff.getDate() - (periodDays[period] ?? 7));
  const periodCutoffISO = periodCutoff.toLocaleDateString("sv-SE");
  const healthLogInPeriod = healthLog.filter(
    (entry) => entry.date >= periodCutoffISO,
  );

  const average = (values: number[]) =>
    values.length === 0
      ? null
      : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
  const avgHeartRate = average(
    healthLogInPeriod.flatMap((entry) => (entry.heartRate ? [entry.heartRate] : [])),
  );
  const avgWeight = average(
    healthLogInPeriod.flatMap((entry) => (entry.weightKg ? [entry.weightKg] : [])),
  );

  return (
    <Page
      eyebrow={subjectName ? "피보호인 AI 건강 분석" : "AI 건강 분석"}
      title={subjectName ? `${subjectName}님의 건강 리포트` : "건강 리포트"}
      description={
        subjectName
          ? "피보호인의 데일리노트와 생활 기록을 바탕으로 건강 변화를 확인해요."
          : "데일리노트와 생활 기록을 함께 살펴 작은 변화도 놓치지 않아요."
      }
      action={
        <div className="flex gap-2">
          <button
            onClick={() => setSharing(true)}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"
          >
            가족에게 알림
          </button>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
          >
            <option>이번 주</option>
            <option>지난 4주</option>
            <option>최근 3개월</option>
          </select>
        </div>
      }
    >
      <section className="grid gap-5 md:grid-cols-4">
        <HealthMetric
          icon="♥"
          label="평균 혈압"
          value="128/82"
          unit="mmHg"
          state="안정"
          color="blue"
        />
        <HealthMetric
          icon="◷"
          label="평균 수면"
          value="7시간 12분"
          unit="매일"
          state="좋음"
          color="violet"
        />
        <HealthMetric
          icon="♟"
          label="평균 걸음"
          value="5,840"
          unit="걸음"
          state="+12%"
          color="emerald"
        />
        <HealthMetric
          icon="✓"
          label="복약 달성"
          value="93"
          unit="%"
          state="양호"
          color="amber"
        />
      </section>
      <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">
              직접 기록한 건강 수치 · {period}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              웨어러블 기기 없이도 심박수·체중을 직접 기록하고, 선택한 기간의
              평균을 확인해요.
            </p>
          </div>
          <button
            onClick={() => setAddingLog(true)}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200"
          >
            ＋ 수치 기록
          </button>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <HealthMetric
            icon="♡"
            label="평균 심박수"
            value={avgHeartRate != null ? String(avgHeartRate) : "-"}
            unit="bpm"
            state={avgHeartRate != null ? "기록 기반" : "기록 없음"}
            color="rose"
          />
          <HealthMetric
            icon="⚖"
            label="평균 체중"
            value={avgWeight != null ? String(avgWeight) : "-"}
            unit="kg"
            state={avgWeight != null ? "기록 기반" : "기록 없음"}
            color="teal"
          />
        </div>
        {healthLog.length > 0 && (
          <div className="mt-5 space-y-2">
            {healthLog.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="text-sm font-black">{entry.date}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.heartRate != null && `심박수 ${entry.heartRate}bpm`}
                    {entry.heartRate != null && entry.weightKg != null && " · "}
                    {entry.weightKg != null && `체중 ${entry.weightKg}kg`}
                  </p>
                </div>
                <button
                  onClick={() => removeHealthLog(entry.id)}
                  className="shrink-0 rounded-xl bg-slate-200 px-3 py-2 text-xs font-black text-slate-600"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">주간 건강 흐름</h2>
              <p className="mt-1 text-sm text-slate-400">
                활동량과 수면 상태를 함께 분석했어요
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
              전반적으로 안정
            </span>
          </div>
          <div className="mt-8 flex h-52 items-end justify-between gap-3 border-b border-slate-200 px-2">
            {[60, 76, 66, 88, 72, 90, 82].map((height, index) => (
              <div
                key={index}
                className="flex h-full flex-1 flex-col items-center justify-end"
              >
                <div
                  className="relative w-full max-w-10 rounded-t-lg bg-blue-100"
                  style={{ height: `${height}%` }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg bg-blue-500"
                    style={{ height: `${height - 18}%` }}
                  />
                </div>
                <span className="mt-2 text-xs font-bold text-slate-400">
                  {["월", "화", "수", "목", "금", "토", "일"][index]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-6 text-xs font-bold text-slate-500">
            <span>
              ● <i className="not-italic text-blue-600">활동량</i>
            </span>
            <span>
              ● <i className="not-italic text-blue-200">수면 충족도</i>
            </span>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              !
            </span>
            <div>
              <p className="text-xs font-black text-amber-600">
                AI 맞춤 건강 알림
              </p>
              <h2 className="mt-1 text-xl font-black">
                혈압 정기 검진 시기예요
              </h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            최근 혈압은 안정적이지만 지난 검진 후 6개월이 지났어요. 현재 상태를
            유지하기 위해 가까운 의료기관에서 정기 검진을 권해드려요.
          </p>
          {hospitals.length > 0 ? (
            <div className="mt-5 rounded-2xl bg-white/80 p-4">
              <p className="text-sm font-black">내 병원</p>
              <p className="mt-1 text-sm text-slate-500">
                {hospitals[0].name}
                {hospitals[0].department ? ` · ${hospitals[0].department}` : ""}
              </p>
              <p className="mt-2 text-sm font-black text-slate-700">
                ☎ {hospitals[0].phone}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-white/80 p-4 text-center">
              <p className="text-sm font-bold text-slate-500">
                아직 등록된 병원이 없어요.
              </p>
            </div>
          )}
          <button
            onClick={() =>
              hospitals.length > 0
                ? setCallTarget(hospitals[0])
                : setAddingHospital(true)
            }
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-amber-500 py-3 font-black text-white shadow-md shadow-amber-200"
          >
            {hospitals.length > 0 ? "병원에 전화해 예약하기" : "다니는 병원 등록하기"}
          </button>
          <p className="mt-3 text-center text-xs font-bold text-amber-700">
            전화 연결만 제공하며 예약은 병원과 직접 확정합니다.
          </p>
        </div>
      </section>
      <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">내가 등록한 병원</h2>
            <p className="mt-1 text-sm text-slate-400">
              자주 다니는 병원을 등록해두면 바로 전화 연결할 수 있어요.
            </p>
          </div>
          <button
            onClick={() => setAddingHospital(true)}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200"
          >
            ＋ 병원 등록
          </button>
        </div>
        {hospitals.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm font-bold text-slate-400">
              등록된 병원이 없어요. 자주 다니는 병원을 등록해 보세요.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-black">
                    {hospital.name}
                    {hospital.department && (
                      <span className="ml-2 text-xs font-bold text-slate-400">
                        {hospital.department}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    ☎ {hospital.phone}
                  </p>
                  {hospital.address && (
                    <p className="mt-1 text-xs text-slate-400">
                      {hospital.address}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCallTarget(hospital)}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-amber-200"
                  >
                    전화하기
                  </button>
                  <button
                    onClick={() => removeHospital(hospital.id)}
                    className="rounded-xl bg-slate-200 px-3 py-2.5 text-sm font-black text-slate-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black">AI가 발견한 좋은 습관</h2>
          <div className="mt-4 space-y-3">
            <CareRow
              icon="✓"
              title="규칙적인 약 복용"
              text="7일 중 6일, 정해진 시간에 복용했어요."
            />
            <CareRow
              icon="✓"
              title="꾸준한 산책"
              text="지난주보다 활동량이 12% 늘었어요."
            />
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black">이번 주 추천 관리</h2>
          <div className="mt-4 space-y-3">
            <CareRow
              icon="1"
              title="저녁 짠 음식 줄이기"
              text="안정적인 혈압 관리에 도움이 돼요."
            />
            <CareRow
              icon="2"
              title="취침 전 가벼운 스트레칭"
              text="더 깊고 편안한 수면을 도와줘요."
            />
          </div>
        </div>
      </section>
      <p className="mt-6 text-center text-xs leading-5 text-slate-400">
        본 리포트는 생활 기록을 기반으로 한 참고 정보이며 의료진의 진단을
        대신하지 않습니다. 응급 증상이 있다면 119에 연락하세요.
      </p>
      {sharing && (
        <FamilyShareModal
          type="건강 리포트"
          title={`${period} 건강 리포트`}
          summary="안심 지수 86점 · 혈압과 수면 상태 안정 · 정기 검진 권장"
          onClose={() => setSharing(false)}
          onSent={(names) => {
            setSharing(false);
            toast({
              message: `${names}에게 건강 리포트 알림을 보냈어요.`,
              tone: "green",
            });
          }}
        />
      )}
      {callTarget && (
        <CallConfirmModal
          title="병원으로 전화 연결"
          phone={callTarget.phone}
          description={`${callTarget.name}으로 예약 전화를 연결하시겠습니까?`}
          note="진료 예약은 병원과 직접 확정해 주세요."
          onClose={() => setCallTarget(null)}
          onConfirm={() => {
            setCallTarget(null);
            window.location.href = `tel:${callTarget.phone.replace(/\D/g, "")}`;
          }}
        />
      )}
      {addingHospital && (
        <HospitalFormModal
          onClose={() => setAddingHospital(false)}
          onSave={addHospital}
        />
      )}
      {addingLog && (
        <HealthLogFormModal
          onClose={() => setAddingLog(false)}
          onSave={addHealthLog}
        />
      )}
    </Page>
  );
}

function HealthLogFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (entry: Omit<HealthLogEntry, "id">) => void;
}) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [heartRate, setHeartRate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [error, setError] = useState("");

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!heartRate.trim() && !weightKg.trim()) {
      setError("심박수 또는 체중 중 하나는 입력해 주세요.");
      return;
    }
    onSave({
      date,
      heartRate: heartRate.trim() ? Number(heartRate) : undefined,
      weightKg: weightKg.trim() ? Number(weightKg) : undefined,
    });
  };

  return (
    <Modal onClose={onClose}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
        ♡
      </span>
      <h2 className="mt-4 text-2xl font-black">건강 수치 기록</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        오늘의 심박수와 체중을 직접 기록해 보세요.
      </p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-black">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black">심박수 (선택)</span>
          <input
            value={heartRate}
            onChange={(e) => {
              setHeartRate(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            inputMode="numeric"
            placeholder="예) 72"
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black">체중 kg (선택)</span>
          <input
            value={weightKg}
            onChange={(e) => {
              setWeightKg(e.target.value.replace(/[^\d.]/g, ""));
              setError("");
            }}
            inputMode="decimal"
            placeholder="예) 58.2"
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500"
          />
        </label>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
          >
            취소
          </button>
          <button className="flex-[1.5] rounded-xl bg-blue-600 py-3 font-black text-white">
            기록하기
          </button>
        </div>
      </form>
    </Modal>
  );
}

function HospitalFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (hospital: Omit<MyHospital, "id">) => void;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");

  return (
    <Modal onClose={onClose}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
        🏥
      </span>
      <h2 className="mt-4 text-2xl font-black">병원 등록</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        자주 다니는 병원을 등록해두면 건강 리포트에서 바로 전화 연결할 수 있어요.
      </p>
      <div className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 rounded-lg py-2 text-sm font-black transition ${
            mode === "search" ? "bg-white shadow-sm" : "text-slate-500"
          }`}
        >
          주소로 검색
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg py-2 text-sm font-black transition ${
            mode === "manual" ? "bg-white shadow-sm" : "text-slate-500"
          }`}
        >
          직접 입력
        </button>
      </div>
      {mode === "search" ? (
        <HospitalSearchForm onClose={onClose} onSave={onSave} />
      ) : (
        <HospitalManualForm onClose={onClose} onSave={onSave} />
      )}
    </Modal>
  );
}

const hospitalInputClass =
  "h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500";

function HospitalManualForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (hospital: Omit<MyHospital, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("병원 이름을 입력해 주세요.");
      return;
    }
    if (!phone.trim()) {
      setError("전화번호를 입력해 주세요.");
      return;
    }
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      department: department.trim() || undefined,
    });
  };

  return (
    <form onSubmit={save} className="mt-5 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-black">병원 이름</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="예) 늘봄내과의원"
          className={hospitalInputClass}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black">전화번호</span>
        <input
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
          }}
          placeholder="예) 02-1234-5678"
          className={hospitalInputClass}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black">진료과 (선택)</span>
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="예) 내과"
          className={hospitalInputClass}
        />
      </label>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
        >
          취소
        </button>
        <button className="flex-[1.5] rounded-xl bg-blue-600 py-3 font-black text-white">
          병원 등록하기
        </button>
      </div>
    </form>
  );
}

function HospitalSearchForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (hospital: Omit<MyHospital, "id">) => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<HospitalSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<HospitalSearchResult | null>(null);
  const [confirmPhone, setConfirmPhone] = useState("");

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError("");
    setResults(null);
    setSelected(null);
    try {
      const found = await searchHospitalsByAddress(query.trim());
      setResults(found);
      if (found.length === 0) {
        setSearchError(
          "검색 결과가 없어요. 다른 주소나 지역명(예: 강남역, 종로구청운동)으로 검색해 보세요.",
        );
      }
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result: HospitalSearchResult) => {
    setSelected(result);
    setConfirmPhone(result.phone);
  };

  const registerSelected = () => {
    if (!selected || !confirmPhone.trim()) return;
    onSave({
      name: selected.name,
      phone: confirmPhone.trim(),
      address: selected.address || undefined,
    });
  };

  if (selected) {
    return (
      <div className="mt-5">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-black">{selected.name}</p>
          {selected.address && (
            <p className="mt-1 text-sm text-slate-500">{selected.address}</p>
          )}
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-black">
            전화번호 {!selected.phone && "(검색 결과에 없어 직접 입력해 주세요)"}
          </span>
          <input
            value={confirmPhone}
            onChange={(e) => setConfirmPhone(e.target.value)}
            placeholder="예) 02-1234-5678"
            className={hospitalInputClass}
          />
        </label>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
          >
            다시 선택
          </button>
          <button
            type="button"
            onClick={registerSelected}
            disabled={!confirmPhone.trim()}
            className="flex-[1.5] rounded-xl bg-blue-600 py-3 font-black text-white disabled:opacity-40"
          >
            이 병원 등록하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예) 서울 종로구 청운동, 강남역"
          className={hospitalInputClass}
        />
        <button
          disabled={searching}
          className="shrink-0 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
        >
          {searching ? "검색 중…" : "검색"}
        </button>
      </form>
      {searchError && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
          {searchError}
        </p>
      )}
      {results && results.length > 0 && (
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => selectResult(result)}
              className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50"
            >
              <p className="font-black">{result.name}</p>
              {result.address && (
                <p className="mt-1 text-xs text-slate-500">
                  {result.address}
                </p>
              )}
              {result.distanceMeters != null && (
                <p className="mt-1 text-xs font-bold text-blue-500">
                  {result.distanceMeters >= 1000
                    ? `${(result.distanceMeters / 1000).toFixed(1)}km`
                    : `${result.distanceMeters}m`}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-slate-100 py-3 font-black"
      >
        취소
      </button>
    </div>
  );
}

function HealthMetric({
  icon,
  label,
  value,
  unit,
  state,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  state: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${colors[color]}`}
        >
          {icon}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-black ${colors[color]}`}
        >
          {state}
        </span>
      </div>
      <p className="mt-5 text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">
        {value}{" "}
        <small className="text-xs font-bold text-slate-400">{unit}</small>
      </p>
    </div>
  );
}
function CareRow({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-blue-600 shadow-sm">
        {icon}
      </span>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function MyPage({
  session,
  saveProfile,
  go,
  toast,
  notificationsEnabled,
  setNotificationsEnabled,
}: {
  session: Session;
  saveProfile: (session: Session) => void;
  go: (tab: ServiceTab) => void;
  toast: (toast: Toast) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(session);
  const [edit, setEdit] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [linkParentOpen, setLinkParentOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [guardianManageOpen, setGuardianManageOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const maskedPhone = `${session.phone.slice(0, 3)}-${session.phone.slice(3, 7)}-${session.phone.slice(7)}`;
  const logout = () => {
    localStorage.removeItem("ansimSession");
    localStorage.removeItem("ansimAutoLogin");
    navigate("/");
  };
  const removeAccount = () => {
    saveSavedUsers(getSavedUsers().filter((u) => u.id !== session.id));
    localStorage.removeItem("ansimSession");
    localStorage.removeItem("ansimAutoLogin");
    navigate("/");
  };
  const completeParentLink = (parent: ParentLink) => {
    saveSavedUsers(
      getSavedUsers().map((user) =>
        user.id === session.id
          ? {
              ...user,
              parent: {
                ...parent,
                address: "",
                consentAt: new Date().toISOString(),
              },
            }
          : user,
      ),
    );
    saveProfile({
      ...session,
      parentName: parent.name,
      parentPhone: parent.phone,
      parentRelation: parent.relation,
    });
    setLinkParentOpen(false);
  };
  return (
    <Page
      eyebrow="내 계정"
      title="마이페이지"
      description="내 정보와 담소 서비스 이용 현황을 한곳에서 관리하세요."
    >
      <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="h-fit rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm">
          <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-5xl">
            {session.accountType === "guardian" ? "👨🏻" : "👵🏻"}
          </span>
          <h2 className="mt-4 text-2xl font-black">{session.name} 님</h2>
          <p className="mt-1 text-sm text-slate-400">
            {session.accountType === "guardian"
              ? session.parentName
                ? `${session.parentName}님의 보호자`
                : "피보호인 계정 미연동"
              : "담소와 함께한 지 128일"}
          </p>
          <span
            className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${session.accountType === "guardian" && !session.parentName ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-600"}`}
          >
            ●{" "}
            {session.accountType === "guardian"
              ? session.parentName
                ? "보호자 계정 · 연결 완료"
                : "보호자 계정 · 연결 필요"
              : "본인인증 완료"}
          </span>
          <div className="mt-6 grid grid-cols-3 border-t border-slate-100 pt-5">
            <MiniStat
              value={
                session.parentName || session.accountType !== "guardian"
                  ? "24"
                  : "-"
              }
              label="기록"
            />
            <MiniStat
              value={
                session.parentName || session.accountType !== "guardian"
                  ? "18"
                  : "-"
              }
              label="대화"
            />
            <MiniStat
              value={
                session.parentName || session.accountType !== "guardian"
                  ? "3"
                  : "-"
              }
              label="자서전"
            />
          </div>
          <button
            onClick={logout}
            className="mt-6 w-full rounded-xl bg-slate-100 py-3 text-sm font-black text-slate-600"
          >
            로그아웃
          </button>
        </div>
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">내 정보</h2>
                <p className="mt-1 text-sm text-slate-400">
                  연락처와 기본 정보를 확인하세요.
                </p>
              </div>
              <button
                onClick={() => setEdit(!edit)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-blue-600"
              >
                {edit ? "취소" : "수정"}
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile(form);
                setEdit(false);
              }}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <ProfileField
                label="이름"
                value={form.name}
                disabled={!edit}
                onChange={(value) => setForm({ ...form, name: value })}
              />
              <ProfileField label="아이디" value={form.id} disabled />
              <ProfileField
                label="휴대전화"
                value={edit ? form.phone : maskedPhone}
                disabled={!edit}
                onChange={(value) =>
                  setForm({
                    ...form,
                    phone: value.replace(/\D/g, "").slice(0, 11),
                  })
                }
              />
              <ProfileField label="생년월일" value="1948년 3월 12일" disabled />
              {edit && (
                <button className="rounded-xl bg-blue-600 py-3 font-black text-white sm:col-span-2">
                  변경사항 저장
                </button>
              )}
            </form>
          </div>
          {session.accountType === "guardian" && session.parentName && (
            <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                  👵🏻
                </span>
                <div>
                  <p className="text-xs font-black text-blue-600">
                    연결된 피보호인
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {session.parentName} 님
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {session.parentRelation || "가족"} ·{" "}
                    {session.parentPhone
                      ? `${session.parentPhone.slice(0, 3)}-${session.parentPhone.slice(3, 7)}-${session.parentPhone.slice(7)}`
                      : "연락처 등록 완료"}
                  </p>
                </div>
                <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  연결됨
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => go("notes")}
                  className="rounded-xl bg-white py-3 text-sm font-black text-blue-700"
                >
                  데일리노트 보기
                </button>
                <button
                  onClick={() => go("health")}
                  className="rounded-xl bg-white py-3 text-sm font-black text-blue-700"
                >
                  건강 리포트 보기
                </button>
              </div>
            </div>
          )}
          {session.accountType === "guardian" && !session.parentName && (
            <div className="rounded-[1.5rem] border-2 border-dashed border-blue-300 bg-blue-50 p-7 text-center shadow-sm">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
                🔗
              </span>
              <h2 className="mt-4 text-xl font-black">
                연결된 피보호인이 없어요
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                피보호인 사용자 계정을 인증하면 데일리노트, 일정과 건강 리포트를
                확인할 수 있어요.
              </p>
              <button
                onClick={() => setLinkParentOpen(true)}
                className="mt-5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"
              >
                피보호인 계정 연동하기
              </button>
            </div>
          )}
          {(session.accountType !== "guardian" || session.parentName) && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">
                {session.accountType === "guardian"
                  ? "보호자 서비스"
                  : "나의 서비스"}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {navItems
                  .filter((item) =>
                    session.accountType === "guardian"
                      ? ["health", "notes", "calendar"].includes(item.id)
                      : [
                          "health",
                          "chat",
                          "biography",
                          "notes",
                          "calendar",
                        ].includes(item.id),
                  )
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className="flex items-center rounded-xl bg-slate-50 p-4 text-left hover:bg-blue-50"
                    >
                      <span className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        {item.icon}
                      </span>
                      <b>
                        {session.accountType === "guardian" &&
                        item.id === "notes"
                          ? "피보호인 데일리노트"
                          : session.accountType === "guardian" &&
                              item.id === "calendar"
                            ? "피보호인 일정"
                            : session.accountType === "guardian" &&
                                item.id === "health"
                              ? "피보호인 건강 리포트"
                              : item.label}
                      </b>
                      <span className="ml-auto text-slate-300">›</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">설정 및 계정 관리</h2>
            <div className="mt-4 divide-y divide-slate-100">
              <SettingRow
                title="알림 설정"
                text="일정·복약 알림을 받아요"
                checked={notificationsEnabled}
                onToggle={setNotificationsEnabled}
              />
              <SettingRow
                title="비밀번호 재설정"
                text="현재 비밀번호를 확인하고 새 비밀번호로 변경해요"
                onClick={() => setPasswordResetOpen(true)}
              />
              <SettingRow
                title="개인정보 처리방침"
                text="내 정보가 어떻게 보호되는지 확인해요"
                onClick={() => setPrivacyOpen(true)}
              />
              <SettingRow
                title="보호자 연결 관리"
                text="가족과 건강 소식을 안전하게 공유해요"
                onClick={() => setGuardianManageOpen(true)}
              />
            </div>
            <button
              onClick={() => setWithdraw(true)}
              className="mt-5 text-sm font-bold text-red-500 underline underline-offset-4"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </section>
      {withdraw && (
        <Modal onClose={() => setWithdraw(false)}>
          <h2 className="text-2xl font-black">정말 탈퇴하시겠어요?</h2>
          <p className="mt-3 leading-7 text-slate-500">
            탈퇴하면 저장된 대화, 데일리노트, 자서전과 건강 기록을 다시 복구할
            수 없습니다.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setWithdraw(false)}
              className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
            >
              계속 이용하기
            </button>
            <button
              onClick={removeAccount}
              className="flex-1 rounded-xl bg-red-500 py-3 font-black text-white"
            >
              탈퇴하기
            </button>
          </div>
        </Modal>
      )}
      {passwordResetOpen && (
        <MyPagePasswordReset
          session={session}
          onClose={() => setPasswordResetOpen(false)}
        />
      )}
      {linkParentOpen && (
        <ParentLinkModal
          onClose={() => setLinkParentOpen(false)}
          onLinked={completeParentLink}
        />
      )}
      {guardianManageOpen && (
        <GuardianConnectionModal
          session={session}
          saveProfile={saveProfile}
          toast={toast}
          onClose={() => setGuardianManageOpen(false)}
          onOpenLink={() => {
            setGuardianManageOpen(false);
            setLinkParentOpen(true);
          }}
        />
      )}
      {privacyOpen && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPrivacyOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 py-10 backdrop-blur-sm sm:py-16"
        >
          <div className="relative w-full max-w-3xl rounded-[1.75rem] bg-white p-6 shadow-2xl sm:p-8">
            <button
              onClick={() => setPrivacyOpen(false)}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500"
            >
              ×
            </button>
            <PrivacyView />
          </div>
        </div>
      )}
    </Page>
  );
}

function GuardianConnectionModal({
  session,
  saveProfile,
  toast,
  onClose,
  onOpenLink,
}: {
  session: Session;
  saveProfile: (session: Session) => void;
  toast: (toast: Toast) => void;
  onClose: () => void;
  onOpenLink: () => void;
}) {
  const isGuardianAccount = session.accountType === "guardian";

  const [guardians, setGuardians] = useState<SavedUser[]>(() =>
    isGuardianAccount
      ? []
      : getSavedUsers().filter(
          (user) =>
            (user.accountType ?? "user") === "guardian" &&
            user.parent &&
            normalizePhone(user.parent.phone) === normalizePhone(session.phone),
        ),
  );

  const disconnectGuardian = (guardianId: string) => {
    saveSavedUsers(
      getSavedUsers().map((user) =>
        user.id === guardianId ? { ...user, parent: undefined } : user,
      ),
    );
    setGuardians((value) => value.filter((g) => g.id !== guardianId));
    toast({ message: "보호자 연결이 해제되었습니다.", tone: "blue" });
  };

  if (isGuardianAccount) {
    const disconnect = () => {
      saveSavedUsers(
        getSavedUsers().map((user) =>
          user.id === session.id ? { ...user, parent: undefined } : user,
        ),
      );
      saveProfile({
        ...session,
        parentName: undefined,
        parentPhone: undefined,
        parentRelation: undefined,
      });
      toast({ message: "피보호인 연결이 해제되었습니다.", tone: "blue" });
      onClose();
    };

    return (
      <Modal onClose={onClose}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          🔗
        </span>
        <h2 className="mt-4 text-2xl font-black">보호자 연결 관리</h2>
        {session.parentName ? (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              현재 <b>{session.parentName}</b>님과 연결되어 데일리노트, 일정,
              건강 리포트를 확인하고 있어요.
            </p>
            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <p className="text-sm font-black">{session.parentName} 님</p>
              <p className="mt-1 text-sm text-slate-500">
                {session.parentRelation || "가족"}
                {session.parentPhone &&
                  ` · ${session.parentPhone.slice(0, 3)}-${session.parentPhone.slice(3, 7)}-${session.parentPhone.slice(7)}`}
              </p>
            </div>
            <button
              onClick={disconnect}
              className="mt-5 w-full rounded-xl bg-red-50 py-3 font-black text-red-600"
            >
              연결 해제하기
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              아직 연결된 피보호인이 없어요. 피보호인 계정을 연동하면
              데일리노트와 건강 리포트를 확인할 수 있어요.
            </p>
            <button
              onClick={onOpenLink}
              className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-black text-white"
            >
              피보호인 계정 연동하기
            </button>
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        🔗
      </span>
      <h2 className="mt-4 text-2xl font-black">보호자 연결 관리</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        나와 연결되어 내 기록을 확인할 수 있는 보호자 목록이에요.
      </p>
      {guardians.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">
          아직 연결된 보호자가 없어요.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{guardian.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {guardian.parent?.relation || "가족"} · {guardian.phone}
                </p>
              </div>
              <button
                onClick={() => disconnectGuardian(guardian.id)}
                className="shrink-0 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-600"
              >
                연결 해제
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ProfileField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}
function SettingRow({
  title,
  text,
  checked,
  onToggle,
  onClick,
}: {
  title: string;
  text: string;
  checked?: boolean;
  onToggle?: (next: boolean) => void;
  onClick?: () => void;
}) {
  const isToggle = onToggle !== undefined;
  return (
    <button
      onClick={() => {
        if (isToggle) onToggle(!checked);
        else onClick?.();
      }}
      className="flex w-full items-center py-4 text-left"
    >
      <span>
        <b className="block text-sm">{title}</b>
        <span className="mt-1 block text-xs text-slate-400">{text}</span>
      </span>
      {isToggle ? (
        <span
          className={`ml-auto flex h-7 w-12 rounded-full p-1 transition ${checked ? "justify-end bg-blue-600" : "justify-start bg-slate-300"}`}
        >
          <i className="h-5 w-5 rounded-full bg-white shadow" />
        </span>
      ) : (
        <span className="ml-auto text-slate-300">›</span>
      )}
    </button>
  );
}

function MyPagePasswordReset({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const resetPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const users = getSavedUsers();
    const matchedUser = users.find(
      (user) => normalizeId(user.id) === normalizeId(session.id),
    );
    const isDemo = session.id === "demo" || session.id === "guardian";
    const demoPasswordKey =
      session.id === "guardian"
        ? "ansimGuardianDemoPassword"
        : "ansimDemoPassword";
    const savedPassword = isDemo
      ? (localStorage.getItem(demoPasswordKey) ?? "1234")
      : matchedUser?.password;

    if (!savedPassword || savedPassword !== currentPassword) {
      setError("현재 비밀번호가 맞지 않습니다.");
      return;
    }
    if (newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== passwordConfirm) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
      return;
    }

    if (isDemo) {
      localStorage.setItem(demoPasswordKey, newPassword);
    } else {
      saveSavedUsers(
        users.map((user) =>
          normalizeId(user.id) === normalizeId(session.id)
            ? { ...user, password: newPassword }
            : user,
        ),
      );
    }
    setCurrentPassword("");
    setNewPassword("");
    setPasswordConfirm("");
    setComplete(true);
  };

  const inputClass =
    "h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500";

  return (
    <Modal onClose={onClose}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        🔒
      </span>
      <h2 className="mt-4 text-2xl font-black">비밀번호 재설정</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        안전한 계정 사용을 위해 현재 비밀번호를 먼저 확인합니다.
      </p>
      {complete ? (
        <div className="mt-6">
          <div className="rounded-2xl bg-emerald-50 p-5 text-center">
            <p className="font-black text-emerald-700">
              비밀번호가 재설정되었습니다.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              다음 로그인부터 새 비밀번호를 사용해 주세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-black text-white"
          >
            확인
          </button>
        </div>
      ) : (
        <form onSubmit={resetPassword} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-black">현재 비밀번호</span>
            <input
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError("");
              }}
              type="password"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black">새 비밀번호</span>
            <input
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
              }}
              type="password"
              placeholder="8자 이상 입력하세요"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black">
              새 비밀번호 확인
            </span>
            <input
              value={passwordConfirm}
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                setError("");
              }}
              type="password"
              placeholder="새 비밀번호를 다시 입력하세요"
              className={inputClass}
            />
          </label>
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
            >
              취소
            </button>
            <button className="flex-[1.5] rounded-xl bg-blue-600 py-3 font-black text-white">
              비밀번호 재설정
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ParentLinkModal({
  onClose,
  onLinked,
}: {
  onClose: () => void;
  onLinked: (parent: ParentLink) => void;
}) {
  const [name, setName] = useState("");
  const [residentFront, setResidentFront] = useState("");
  const [residentBackFirst, setResidentBackFirst] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("자녀");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  const verifyAndLink = () => {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (
      name.trim().length < 2 ||
      !/^\d{6}$/.test(residentFront) ||
      !/^[1-4]$/.test(residentBackFirst) ||
      !/^01[016789]\d{7,8}$/.test(normalizedPhone)
    ) {
      setError("성함, 주민등록번호와 전화번호를 정확히 입력해 주세요.");
      return;
    }
    if (!consent) {
      setError("피보호인 계정 연결과 개인정보 이용 동의가 필요합니다.");
      return;
    }

    const isDemoParent =
      name.trim() === "김순자" &&
      residentFront === "480312" &&
      residentBackFirst === "2" &&
      normalizedPhone === "01012345678";
    const users = getSavedUsers();
    const matchedParent = users.some(
      (user) =>
        (user.accountType ?? "user") === "user" &&
        user.name === name.trim() &&
        user.residentFront === residentFront &&
        user.residentBackFirst === residentBackFirst &&
        user.phone === normalizedPhone,
    );
    if (!isDemoParent && !matchedParent) {
      setError("입력한 정보와 일치하는 사용자 계정을 찾을 수 없습니다.");
      return;
    }

    onLinked({
      name: name.trim(),
      phone: normalizedPhone,
      relation,
      residentFront,
      residentBackFirst,
    });
  };

  return (
    <Modal onClose={onClose}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        🔗
      </span>
      <h2 className="mt-4 text-2xl font-black">피보호인 계정 연동하기</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        피보호인의 사용자 계정에 등록된 정보와 대조해 본인 계정을 인증합니다.
      </p>
      <div className="mt-6 space-y-4">
        <label>
          <span className="mb-2 block text-sm font-black">피보호인 성함</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="성함을 입력하세요"
            className="h-13 w-full rounded-xl border-2 border-slate-200 px-4 font-bold outline-none focus:border-blue-500"
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-black">피보호인 주민등록번호</p>
          <div className="flex items-center gap-2">
            <input
              value={residentFront}
              onChange={(event) => {
                setResidentFront(
                  event.target.value.replace(/\D/g, "").slice(0, 6),
                );
                setError("");
              }}
              inputMode="numeric"
              placeholder="앞 6자리"
              className="h-13 min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-4 font-bold outline-none focus:border-blue-500"
            />
            <span className="font-black text-slate-400">-</span>
            <div className="flex h-13 min-w-0 flex-1 items-center rounded-xl border-2 border-slate-200 px-4">
              <input
                value={residentBackFirst}
                onChange={(event) => {
                  setResidentBackFirst(
                    event.target.value.replace(/\D/g, "").slice(0, 1),
                  );
                  setError("");
                }}
                inputMode="numeric"
                placeholder="1"
                className="w-6 font-bold outline-none"
              />
              <span className="ml-1 font-black tracking-[0.12em] text-slate-400">
                ******
              </span>
            </div>
          </div>
        </div>
        <label>
          <span className="mb-2 block text-sm font-black">
            피보호인 전화번호
          </span>
          <input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value.replace(/\D/g, "").slice(0, 11));
              setError("");
            }}
            inputMode="numeric"
            placeholder="01012345678"
            className="h-13 w-full rounded-xl border-2 border-slate-200 px-4 font-bold outline-none focus:border-blue-500"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-black">보호자와의 관계</span>
          <select
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
            className="h-13 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500"
          >
            <option value="자녀">자녀</option>
            <option value="며느리·사위">며느리·사위</option>
            <option value="손자녀">손자녀</option>
            <option value="기타 가족">기타 가족</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              setError("");
            }}
            className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
          />
          피보호인에게 계정 연결과 건강·생활 기록 공유 동의를 받았습니다. (필수)
        </label>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
          {error}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
        >
          취소
        </button>
        <button
          onClick={verifyAndLink}
          className="flex-[1.5] rounded-xl bg-blue-600 py-3 font-black text-white shadow-lg shadow-blue-200"
        >
          인증하고 연결하기
        </button>
      </div>
    </Modal>
  );
}

function FamilyShareModal({
  type,
  title,
  summary,
  onClose,
  onSent,
}: {
  type: "데일리노트" | "건강 리포트";
  title: string;
  summary: string;
  onClose: () => void;
  onSent: (names: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    familyContacts.map((contact) => contact.id),
  );
  const [method, setMethod] = useState<"문자" | "카카오 알림톡">(
    "카카오 알림톡",
  );
  const [includeSummary, setIncludeSummary] = useState(true);

  const toggleContact = (id: number) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  };

  const sendAlert = () => {
    const recipients = familyContacts.filter((contact) =>
      selectedIds.includes(contact.id),
    );
    const alerts = loadStored<Array<Record<string, unknown>>>(
      "ansimFamilyAlerts",
      [],
    );
    localStorage.setItem(
      "ansimFamilyAlerts",
      JSON.stringify([
        {
          id: Date.now(),
          type,
          title,
          summary: includeSummary ? summary : undefined,
          method,
          recipients: recipients.map((contact) => contact.name),
          sentAt: new Date().toISOString(),
        },
        ...alerts,
      ]),
    );
    onSent(recipients.map((contact) => contact.name).join(", "));
  };

  return (
    <Modal onClose={onClose}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        👨‍👩‍👧
      </span>
      <h2 className="mt-4 text-2xl font-black">가족에게 알림 보내기</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        연결된 가족에게 {type} 소식을 안전하게 전달해요.
      </p>
      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-black text-blue-600">{type}</p>
        <p className="mt-1 font-black text-slate-800">{title}</p>
        {includeSummary && (
          <p className="mt-2 text-xs leading-5 text-slate-500">{summary}</p>
        )}
      </div>
      <div className="mt-6">
        <p className="mb-3 text-sm font-black">받을 가족 선택</p>
        <div className="space-y-2">
          {familyContacts.map((contact) => {
            const checked = selectedIds.includes(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`flex w-full items-center rounded-xl border-2 p-3 text-left transition ${checked ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                  {contact.emoji}
                </span>
                <span className="ml-3">
                  <b className="block text-sm">
                    {contact.name} · {contact.relation}
                  </b>
                  <span className="text-xs text-slate-400">
                    {contact.phone}
                  </span>
                </span>
                <span
                  className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${checked ? "bg-blue-600 text-white" : "border-2 border-slate-300"}`}
                >
                  {checked && "✓"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(["카카오 알림톡", "문자"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setMethod(item)}
            className={`rounded-xl border-2 py-3 text-sm font-black ${method === item ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}
          >
            {item === "카카오 알림톡" ? "💬 " : "✉ "}
            {item}
          </button>
        ))}
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
        <input
          type="checkbox"
          checked={includeSummary}
          onChange={(event) => setIncludeSummary(event.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
        알림에 요약 내용 포함하기
      </label>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        선택한 가족에게만 전송되며, 상세 기록은 본인 동의 없이 공개되지
        않습니다.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-slate-100 py-3 font-black"
        >
          취소
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={sendAlert}
          className="flex-[1.5] rounded-xl bg-blue-600 py-3 font-black text-white shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none"
        >
          {selectedIds.length}명에게 알림 보내기
        </button>
      </div>
    </Modal>
  );
}

function CallConfirmModal({
  title,
  phone,
  description,
  note,
  onClose,
  onConfirm,
}: {
  title: string;
  phone: string;
  description: string;
  note: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-call-confirm-title"
        className="w-full max-w-md rounded-[2rem] bg-white p-7 text-center shadow-2xl sm:p-8"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
          ☎️
        </span>
        <h2
          id="dashboard-call-confirm-title"
          className="mt-5 text-2xl font-black text-slate-950"
        >
          {title}
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          <b>{phone}</b>
          <br />
          {description}
        </p>
        <p className="mt-3 text-xs font-bold text-slate-400">{note}</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="h-13 rounded-xl bg-slate-100 font-black text-slate-600 hover:bg-slate-200"
          >
            아니오
          </button>
          <button
            onClick={onConfirm}
            className="h-13 rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            예
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl rounded-[1.75rem] bg-white p-7 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default Dashboard;
