import { useState } from 'react'
import { Link } from 'react-router-dom'

function Home() {
  return (
    <main className="overflow-hidden pb-24 md:pb-0">
      <HeroSection />
      <ServiceIntro />
      <AiServiceSection />
      <CareProcess />
      <StorySection />
      <ProductSection />
      <GuideSection />
      <Footer />
      <MobileBottomNav />
    </main>
  )
}

function HeroSection() {
  const [callConfirmOpen, setCallConfirmOpen] = useState(false)

  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-blue-100 px-5 py-3 text-base font-bold text-blue-700">
            AI 파트너 도담과 함께하는 생활 돌봄 서비스
          </div>

          <h1 className="text-[44px] font-black leading-tight tracking-tight text-slate-950 sm:text-[58px] lg:text-[68px]">
            멀리 있어도,
            <br />
            <span className="text-blue-600">돌봄은 가까이</span>
          </h1>

          <p className="mt-7 max-w-xl text-xl leading-9 text-slate-700 sm:text-2xl">
            도담이 피보호인의 대화와 목소리를 기록하고 건강 변화를 살펴,
            필요한 진료와 돌봄을 가족에게 이어드립니다.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/?login=true"
              className="inline-flex min-h-16 items-center justify-center rounded-full bg-blue-600 px-9 text-xl font-extrabold text-white shadow-xl shadow-blue-200 transition hover:bg-blue-700"
            >
              도담과 시작하기
            </Link>
            <button onClick={() => setCallConfirmOpen(true)} className="inline-flex min-h-16 items-center justify-center rounded-full border-2 border-blue-200 bg-white px-9 text-xl font-extrabold text-blue-700 transition hover:bg-blue-50">
              📞 0000-0000
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniFeature icon="🌼" title="AI 파트너" />
            <MiniFeature icon="🎙️" title="자동 기록" />
            <MiniFeature icon="❤️" title="건강 케어" />
            <MiniFeature icon="🔄" title="가족 동기화" />
          </div>
        </div>

        <HeroCareVisual />
      </div>
      {callConfirmOpen && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCallConfirmOpen(false)
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-sm"
        >
          <div role="dialog" aria-modal="true" aria-labelledby="call-confirm-title" className="w-full max-w-md rounded-[2rem] bg-white p-7 text-center shadow-2xl sm:p-8">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">☎️</span>
            <h2 id="call-confirm-title" className="mt-5 text-2xl font-black text-slate-950">고객센터로 전화 연결</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">0000-0000 고객센터로<br />전화를 연결하시겠습니까?</p>
            <p className="mt-3 text-xs font-bold text-slate-400">상담 시간 · 평일 09:00–18:00</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button onClick={() => setCallConfirmOpen(false)} className="h-13 rounded-xl bg-slate-100 font-black text-slate-600 hover:bg-slate-200">아니오</button>
              <button onClick={() => { setCallConfirmOpen(false); window.location.href = 'tel:00000000' }} className="h-13 rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700">예</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function MiniFeature({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-l-2 border-blue-100 pl-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm">{icon}</div>
      <p className="text-sm font-black text-slate-700">{title}</p>
    </div>
  )
}

function HeroCareVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] py-8 lg:py-0">
      <div className="absolute left-10 top-0 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute bottom-0 right-6 h-56 w-56 rounded-full bg-blue-300/30 blur-3xl" />

      <div className="relative min-h-[570px] overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/65 p-6 shadow-[0_30px_80px_-30px_rgba(30,64,175,0.35)] backdrop-blur-xl sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="담소" className="h-10 w-10 rounded-xl" />
            <div><p className="text-xs font-black tracking-[0.18em] text-blue-600">DAMSO CARE FLOW</p><p className="text-sm font-bold text-slate-400">대화에서 돌봄까지</p></div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-600">● 실시간 연결</span>
        </div>

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 620 570" fill="none" aria-hidden="true">
          <path d="M310 174 C210 174 190 210 165 258" stroke="#BFDBFE" strokeWidth="2" strokeDasharray="7 8" />
          <path d="M310 174 C410 174 438 210 458 258" stroke="#BFDBFE" strokeWidth="2" strokeDasharray="7 8" />
          <path d="M165 337 C200 390 235 404 310 410" stroke="#BFDBFE" strokeWidth="2" strokeDasharray="7 8" />
          <path d="M458 337 C425 390 385 404 310 410" stroke="#BFDBFE" strokeWidth="2" strokeDasharray="7 8" />
        </svg>

        <div className="relative mx-auto mt-10 flex w-fit flex-col items-center">
          <div className="absolute inset-0 scale-150 rounded-full bg-blue-200/30 blur-2xl" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-white bg-gradient-to-br from-amber-100 to-orange-100 text-5xl shadow-xl">🌼</div>
          <span className="relative mt-3 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-black text-white">AI 파트너 도담</span>
        </div>

        <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/60">
            <div className="flex items-center justify-between"><span className="text-xl">🎙️</span><span className="text-[10px] font-black text-blue-600">VOICE DETECTED</span></div>
            <p className="mt-3 text-sm font-black text-slate-800">“오늘 무릎이 조금 불편했어”</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">목소리와 대화 맥락을 기록했어요</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-lg shadow-violet-100/60">
            <div className="flex items-center justify-between"><span className="text-xl">📘</span><span className="text-[10px] font-black text-violet-600">AUTO NOTE</span></div>
            <p className="mt-3 text-sm font-black text-slate-800">데일리노트 자동 완성</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">일상과 건강 언급을 나눠 정리했어요</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-lg shadow-rose-100/60">
            <div className="flex items-center justify-between"><span className="text-xl">❤️</span><span className="text-[10px] font-black text-rose-600">HEALTH SIGNAL</span></div>
            <p className="mt-3 text-sm font-black text-slate-800">건강 변화 살펴보기</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" /></div>
            <p className="mt-2 text-xs text-slate-400">현재 안심 지수 86점 · 양호</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-100/60">
            <div className="flex items-center justify-between"><span className="text-xl">🔄</span><span className="text-[10px] font-black text-emerald-600">FAMILY SYNC</span></div>
            <p className="mt-3 text-sm font-black text-slate-800">보호자에게 안심 전달</p>
            <div className="mt-3 flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-xs">👨🏻</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-xs">👩🏻</span><span className="ml-3 text-xs font-bold text-slate-400">가족 2명 연결</span></div>
          </div>
        </div>

        <div className="relative mt-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />도담이 오늘의 이야기를 돌봄으로 연결하고 있어요</div>
      </div>
    </div>
  )
}

function ServiceIntro() {
  return (
    <section id="service" className="scroll-mt-20 bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-7 px-5 sm:px-8 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-blue-50 p-8 sm:p-12">
          <p className="text-lg font-bold text-blue-700">
            피보호인과 보호자를 잇는 AI 돌봄
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-slate-950">
            당신의 파트너 
            <span className="text-blue-600"> 담소</span>
          </h2>
          <p className="mt-7 text-xl leading-9 text-slate-700">
            저희 담소에서는 인공지능 도담을 통해 채팅과 음성 대화를 자동으로 기록하고,
            심리적인 안정을 제공하며 사용자의 일상을 기록해주며 사용자의 삶의 이야기를
            E-Book으로 자동생성까지 도와드리는 서비스입니다. 부가적으로 건강리포트를
            작성하고 필요한 순간에 사용자와 보호자에게 동기화하여 Health케어 서비스를 제공,
            보호자와 사용자의 심리적 케어 부담을 줄이는 서비스 입니다. 
          </p>

          <div className="mt-10 flex items-center gap-5">
            <img src="/logo.svg" alt="담소" className="h-24 w-24 rounded-[2rem] shadow-lg" />
            <div>
              <p className="text-lg font-bold text-blue-700">
                사용자를 편안하게, 보호자는 든든하게
              </p>
              <p className="text-2xl font-black text-slate-900">담소</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ServiceCard icon="🌼" title="AI 파트너 도담" text="음성과 문자로 언제든 편안하게 대화" />
          <ServiceCard icon="📘" title="생활 자동 기록" text="대화를 데일리노트와 일정으로 자동 정리" />
          <ServiceCard icon="📈" title="건강 리포트" text="생활 기록 속 건강 변화와 이상 신호 분석" />
          <ServiceCard icon="👨‍👩‍👧" title="보호자 동기화" text="멀리 있는 가족에게 필요한 소식만 전달" />
        </div>
      </div>
    </section>
  )
}

function ServiceCard({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-5 text-2xl font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-lg leading-8 text-slate-600">{text}</p>
    </div>
  )
}

function CareProcess() {
  const items = [
    {
      num: '01',
      title: '도담과 편안한 대화',
      text: '피보호인이 음성이나 문자로 일상과 몸 상태를 자연스럽게 이야기합니다.',
      emoji: '🌼',
    },
    {
      num: '02',
      title: '채팅·음성 자동 기록',
      text: '대화 내용을 데일리노트, 일정과 건강 기록으로 자동 정리합니다.',
      emoji: '🎙️',
    },
    {
      num: '03',
      title: '건강 리포트 분석',
      text: '누적 기록을 살펴 평소와 다른 건강 변화와 관리 신호를 찾아냅니다.',
      emoji: '📊',
    },
    {
      num: '04',
      title: '병원 전화 연결·맞춤 케어',
      text: '필요한 병원과 전문가를 안내하고 바로 예약 전화를 걸 수 있도록 연결합니다.',
      emoji: '🏥',
    },
    {
      num: '05',
      title: '보호자 자동 동기화',
      text: '중요 기록과 건강 알림을 보호자에게 전달해 멀리서도 함께 돌볼 수 있습니다.',
      emoji: '🔄',
    },
  ]

  return (
    <section id="care" className="scroll-mt-20 bg-white py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <h2 className="text-3xl font-black text-slate-950">
            이야기에서 돌봄까지, 하나로 이어집니다
          </h2>
          <p className="mt-3 text-lg text-slate-500">도담과 나눈 평범한 대화가 필요한 건강 관리와 가족의 안심으로 연결됩니다.</p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {items.map((item) => (
              <div key={item.num} className="rounded-[2rem] bg-slate-50 p-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                    {item.num}
                  </span>
                  <span className="text-5xl">{item.emoji}</span>
                </div>
                <h3 className="mt-5 text-xl font-black leading-snug text-blue-700">
                  {item.title}
                </h3>
                <p className="mt-4 text-lg leading-8 text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StorySection() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="text-center text-3xl font-black text-slate-950">
          피보호인도 보호자도 한결 가벼워졌어요
        </h2>
        <p className="mt-3 text-center text-lg text-slate-500">일상의 연결이 돌봄 부담을 덜어낸 실제 사용 경험입니다.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <StoryCard
            image="👵🏻"
            title="대화만 했는데 하루가 기록돼요"
            text="도담에게 오늘 있었던 일과 몸 상태를 말하면 데일리노트와 건강 기록이 만들어져요. 복잡하게 입력하지 않아도 되어 매일 편하게 사용합니다."
            name="피보호인 김영희님"
          />
          <StoryCard
            image="👨‍👩‍👧"
            title="멀리 있어도 필요한 순간을 알아요"
            text="매번 전화로 확인하지 않아도 어머니의 일정과 건강 리포트를 볼 수 있어요. 검진 알림에서 병원으로 바로 전화할 수 있어 돌봄 부담이 많이 줄었습니다."
            name="보호자 이민수님"
          />
        </div>
      </div>
    </section>
  )
}

function StoryCard({
  image,
  title,
  text,
  name,
}: {
  image: string
  title: string
  text: string
  name: string
}) {
  return (
    <div className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[180px_1fr]">
      <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] bg-blue-50 text-7xl">
        {image}
      </div>
      <div className="p-2">
        <h3 className="text-2xl font-black text-slate-950">{title}</h3>
        <p className="mt-4 text-lg leading-8 text-slate-700">{text}</p>
        <p className="mt-5 text-base font-bold text-slate-500">{name}</p>
      </div>
    </div>
  )
}

function ProductSection() {
  return (
    <section className="bg-gradient-to-br from-blue-950 to-blue-600 py-16 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="text-xl font-bold text-blue-100">보호자를 위한 안심 동기화</p>
          <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">곁에 있지 않아도<br />오늘을 함께 봅니다</h2>
          <p className="mt-6 text-xl leading-9 text-blue-50">
            피보호인의 동의를 바탕으로 데일리노트, 건강 리포트, 병원 예약과
            치료 일정을 보호자 계정에 자동으로 동기화합니다. 매번 묻고 확인하는
            부담은 줄이고, 도움이 필요한 순간에는 더 빠르게 함께할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3"><span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">개인정보 보호</span><span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">피보호인 동의 기반</span><span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">필요한 정보만 공유</span></div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-2xl">👵🏻</span><div><b className="block">김순자 님</b><span className="text-xs font-bold text-emerald-600">● 안전하게 연결됨</span></div></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">보호자 화면</span></div>
          <div className="mt-5 space-y-3">
            <ProductFeature icon="📘" title="오늘의 데일리노트" text="공원 산책과 친구를 만난 이야기가 기록됐어요." />
            <ProductFeature icon="❤️" title="건강 리포트" text="안심 지수 86점 · 전반적으로 안정적이에요." />
            <ProductFeature icon="🏥" title="진료 일정" text="7월 3일 오후 3:30 · 늘봄내과 정기 검진" />
            <ProductFeature icon="🔔" title="맞춤형 케어 알림" text="정기 검진 시기가 되어 예약을 도와드렸어요." />
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductFeature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">{icon}</span>
      <div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div>
    </div>
  )
}

function GuideSection() {
  const guides = [
    {
      title: '도담에게 편하게 이야기해요',
      text: '버튼을 누르고 말하거나 문자로 오늘의 일상과 몸 상태를 들려주세요.',
      icon: '🌼',
    },
    {
      title: '기록은 자동으로 완성돼요',
      text: '채팅과 음성 대화가 데일리노트, 건강 기록과 일정으로 정리됩니다.',
      icon: '📘',
    },
    {
      title: '건강 변화를 확인해요',
      text: 'AI가 누적 기록을 분석해 건강 리포트와 필요한 관리 방법을 알려드려요.',
      icon: '📊',
    },
    {
      title: '진료와 가족 돌봄으로 이어져요',
      text: '필요하면 병원 예약 전화로 연결하고 중요한 소식을 연결된 보호자에게 전달합니다.',
      icon: '🤝',
    },
  ]

  return (
    <section id="guide" className="scroll-mt-20 bg-blue-50 py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="text-center text-4xl font-black text-slate-950">
          복잡한 입력 없이, 대화만 시작하세요
        </h2>
        <p className="mt-4 text-center text-xl text-slate-600">
          피보호인의 편안한 대화가 기록과 건강 관리, 가족의 안심으로 이어집니다.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {guides.map((guide, index) => (
            <div
              key={guide.title}
              className="rounded-[2rem] bg-white p-6 shadow-md"
            >
              <div className="flex h-32 items-center justify-center rounded-[1.5rem] bg-blue-100 text-7xl">
                {guide.icon}
              </div>
              <h3 className="mt-6 text-xl font-black leading-snug text-blue-700">
                {index + 1}. {guide.title}
              </h3>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                {guide.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AiServiceSection() {
  const principles = [
    {
      number: '01',
      title: '쉬운 말로, 서두르지 않게',
      text: '도담은 피보호인의 말하는 속도와 표현에 맞춰 묻고, 이해하기 어려운 내용은 다시 차분히 설명합니다.',
    },
    {
      number: '02',
      title: '필요한 정보만 안전하게',
      text: '대화와 건강 기록은 서비스 제공에 필요한 범위에서만 사용하며, 피보호인의 동의에 따라 공유 범위를 정합니다.',
    },
    {
      number: '03',
      title: '의료진의 판단을 대신하지 않게',
      text: '건강 리포트는 생활 관리를 위한 참고 정보로 제공하고, 진단이 필요한 신호는 병원과 전문가에게 연결합니다.',
    },
    {
      number: '04',
      title: '보호자에게 꼭 필요한 순간만',
      text: '모든 대화를 그대로 전달하지 않고, 동의된 일상 요약과 중요한 건강 변화만 보호자에게 알려드립니다.',
    },
  ]

  return (
    <section id="ai" className="scroll-mt-20 bg-[#f5f8fc] py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:py-6">
          <p className="text-sm font-black tracking-[0.16em] text-blue-600">DODAM AI PRINCIPLES</p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">잘 듣는 AI보다,<br /><span className="text-blue-600">조심스럽게 돌보는 AI</span></h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">도담은 많은 기능을 보여주는 것보다 피보호인이 안심하고 이야기할 수 있는 관계와 원칙을 먼저 생각합니다.</p>
          <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-5"><p className="text-sm font-black text-slate-800">담소의 약속</p><p className="mt-2 text-sm leading-6 text-slate-500">AI의 분석은 사람의 돌봄을 돕기 위한 도구이며, 중요한 결정은 피보호인·보호자·전문가가 함께 내립니다.</p></div>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {principles.map((principle) => (
            <div key={principle.number} className="grid gap-3 py-7 sm:grid-cols-[64px_1fr] sm:py-8">
              <span className="text-sm font-black text-blue-600">{principle.number}</span>
              <div><h3 className="text-xl font-black text-slate-900">{principle.title}</h3><p className="mt-3 text-base leading-7 text-slate-600">{principle.text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="담소" className="h-11 w-11 rounded-2xl" />
            <span className="text-2xl font-black">담소</span>
          </div>
          <p className="mt-5 text-base leading-7 text-slate-300">
            AI 파트너 도담으로 피보호인의 일상과 가족의 안심을 연결합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-300"><span>이용약관</span><span>·</span><Link to="/support">개인정보 처리방침</Link><span>·</span><Link to="/support">고객센터</Link></div>
          <p className="mt-3 text-sm leading-6 text-slate-400">대표번호 0000-0000 · help@damso.co.kr<br />Copyright © 2026 담소. All rights reserved.</p>
        </div>

        <div className="flex gap-4 text-3xl">
          <span>🟩</span>
          <span>💬</span>
          <span>▶️</span>
          <span>📘</span>
        </div>
      </div>
    </footer>
  )
}

function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white md:hidden">
      <div className="grid h-20 grid-cols-5 text-center text-xs font-bold text-slate-600">
        <a href="#" className="flex flex-col items-center justify-center gap-1 text-blue-600">
          <span className="text-2xl">🏠</span>
          홈
        </a>
        <a href="#ai" className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">🛡️</span>
          AI 원칙
        </a>
        <a href="#care" className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">❤️</span>
          돌봄
        </a>
        <a href="#guide" className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">📖</span>
          이용방법
        </a>
        <Link to="/support" className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">☎️</span>
          고객센터
        </Link>
      </div>
    </nav>
  )
}

export default Home
