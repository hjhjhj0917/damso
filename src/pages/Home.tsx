function Home() {
  return (
    <main className="overflow-hidden pb-24 md:pb-0">
      <HeroSection />
      <ServiceIntro />
      <CareProcess />
      <StorySection />
      <ProductSection />
      <GuideSection />
      <AiServiceSection />
      <Footer />
      <MobileBottomNav />
    </main>
  )
}

function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-blue-100 px-5 py-3 text-base font-bold text-blue-700">
            AI 기반 노년 안심 케어 서비스
          </div>

          <h1 className="text-[44px] font-black leading-tight tracking-tight text-slate-950 sm:text-[58px] lg:text-[68px]">
            당신의 이야기를
            <br />
            <span className="text-blue-600">목소리로 기록하세요</span>
          </h1>

          <p className="mt-7 max-w-xl text-xl leading-9 text-slate-700 sm:text-2xl">
            음성으로 쉽게 일기와 자서전을 작성하고, 건강 상태와 일상 변화를
            가족과 함께 확인할 수 있습니다.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <button className="min-h-16 rounded-full bg-blue-600 px-9 text-xl font-extrabold text-white shadow-xl shadow-blue-200 transition hover:bg-blue-700">
              🎙 시작하기
            </button>
            <button className="min-h-16 rounded-full border-2 border-blue-200 bg-white px-9 text-xl font-extrabold text-blue-700 transition hover:bg-blue-50">
              📞 010.3422.5807
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniFeature icon="🛡️" title="24시간 보호" />
            <MiniFeature icon="🔔" title="보호자 알림" />
            <MiniFeature icon="🎙️" title="음성 기록" />
            <MiniFeature icon="❤️" title="건강 확인" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-10 hidden rounded-3xl bg-white px-6 py-4 text-lg font-bold shadow-xl lg:block">
            🔊 오늘 날씨가 참 좋았어요
          </div>

          <div className="absolute -right-2 bottom-20 hidden rounded-3xl bg-white px-6 py-4 text-lg font-bold shadow-xl lg:block">
            💬 오래 기억하고 싶은 하루예요
          </div>

          <div className="rounded-[3rem] bg-white p-5 shadow-2xl">
            <div className="rounded-[2.5rem] bg-gradient-to-br from-blue-100 to-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    ♡
                  </div>
                  <span className="text-xl font-black">안심지키미</span>
                </div>
                <span className="text-2xl">☰</span>
              </div>

              <div className="mt-10 rounded-[2rem] bg-white/80 p-8 text-center shadow-inner">
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-7xl">
                  👵
                </div>
                <h2 className="mt-8 text-3xl font-black leading-snug text-slate-950">
                  오늘의 이야기를
                  <br />
                  <span className="text-blue-600">남겨보세요</span>
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  버튼 하나로 음성 기록을 시작할 수 있어요.
                </p>
                <button className="mt-7 min-h-14 rounded-2xl bg-blue-600 px-8 text-lg font-black text-white shadow-lg">
                  기록 시작하기
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <AppCard icon="🎙️" title="음성 기록" text="말로 편하게 기록" />
                <AppCard icon="📅" title="체계적 관리" text="일상을 쉽게 정리" />
                <AppCard icon="📊" title="건강 리포트" text="변화를 확인" />
                <AppCard icon="👨‍👩‍👧" title="가족 공유" text="소중한 추억 공유" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniFeature({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 text-center shadow-md">
      <div className="text-3xl">{icon}</div>
      <p className="mt-3 text-base font-black text-slate-800">{title}</p>
    </div>
  )
}

function AppCard({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-md">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-3 text-lg font-black">{title}</h3>
      <p className="mt-1 text-base text-slate-600">{text}</p>
    </div>
  )
}

function ServiceIntro() {
  return (
    <section id="service" className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-7 px-5 sm:px-8 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-blue-50 p-8 sm:p-12">
          <p className="text-lg font-bold text-blue-700">
            스마트 돌봄 서비스의 새로운 기준
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-slate-950">
            <span className="text-blue-600">안심지키미</span> 서비스란?
          </h2>
          <p className="mt-7 text-xl leading-9 text-slate-700">
            독거 노인 및 1인 가구의 생활 안전과 돌봄을 위해 IoT 기술과 AI
            분석을 결합한 스마트 돌봄 서비스입니다. 위급 상황 감지부터 일상
            기록, AI 대화까지 따뜻한 일상을 지원합니다.
          </p>

          <div className="mt-10 flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-blue-600 text-5xl text-white">
              ♡
            </div>
            <div>
              <p className="text-lg font-bold text-blue-700">
                사랑하는 사람도, 돌보는 당신도 안심됩니다
              </p>
              <p className="text-2xl font-black text-slate-900">안심지키미</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ServiceCard icon="🎙️" title="음성 기록" text="키보드 없이 말로 기록" />
          <ServiceCard icon="📘" title="데일리 노트" text="하루 일상을 자동 정리" />
          <ServiceCard icon="🤖" title="AI 대화" text="외로움을 덜어주는 대화" />
          <ServiceCard icon="📈" title="건강 리포트" text="일상 패턴 변화 확인" />
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
      title: '24시간 데이터 수집 및 분석',
      text: '생활 데이터를 실시간으로 확인하여 이상 징후를 빠르게 감지합니다.',
      emoji: '👵',
    },
    {
      num: '02',
      title: 'AI 이상 징후 조기 감지',
      text: '평소와 다른 움직임이나 생활 패턴을 AI가 분석합니다.',
      emoji: '📡',
    },
    {
      num: '03',
      title: '현지 기반 긴급 출동 대응',
      text: '필요 시 가까운 기관과 연계하여 빠른 도움을 지원합니다.',
      emoji: '🚑',
    },
    {
      num: '04',
      title: '원 클릭 AI 실연',
      text: '복잡한 조작 없이 AI와 대화하고 정서적 위로를 받을 수 있습니다.',
      emoji: '👴',
    },
  ]

  return (
    <section id="care" className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <h2 className="text-3xl font-black text-slate-950">
            안심지키미가 함께합니다
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <div key={item.num} className="rounded-[2rem] bg-slate-50 p-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                    {item.num}
                  </span>
                  <span className="text-5xl">{item.emoji}</span>
                </div>
                <h3 className="mt-5 text-2xl font-black leading-snug text-blue-700">
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
          안심지키미를 경험한 고객의 이야기
        </h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <StoryCard
            image="🏡"
            title="고독사 예방 스마트 돌봄 시스템"
            text="혼자 사시는 어머니가 안심지키미로 더 안전하게 생활하고 있어요. 이상 상황을 빠르게 확인할 수 있어 보호자 입장에서도 안심됩니다."
            name="이용자 김영희님"
          />
          <StoryCard
            image="🤖"
            title="AI에서지킴이"
            text="언제나 곁에 있는 느낌이라 편안합니다. 가족과 일상을 공유할 수 있어 외로움이 많이 줄었습니다."
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
          <p className="text-xl font-bold text-blue-100">
            국내 최고의 AI 기반 스마트 돌봄 서비스
          </p>
          <h2 className="mt-5 text-5xl font-black leading-tight">
            “안심지키미”
          </h2>
          <p className="mt-6 text-xl leading-9 text-blue-50">
            사랑하는 사람을 위한 가장 쉬운 선택. 작은 기기 하나로 일상
            모니터링, 이상 감지, AI 대화 서비스를 제공합니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="flex items-center justify-center">
            <div className="relative h-44 w-64 rounded-[2rem] bg-slate-950 shadow-2xl">
              <div className="absolute -top-32 right-16 h-36 w-5 rounded-full bg-slate-900" />
              <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              <div className="absolute bottom-6 left-7 h-2 w-20 rounded-full bg-slate-700" />
            </div>
          </div>

          <div className="space-y-5">
            <ProductFeature title="온도 & 습도 센서" />
            <ProductFeature title="조도, 움직임, 리모컨 센서" />
            <ProductFeature title="고성능 LTE 무선통신" />
            <ProductFeature title="저전력 운영 & 배터리 백업" />
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductFeature({ title }: { title: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-2 text-base leading-7 text-blue-50">
        일상 데이터를 안정적으로 수집하고 보호자에게 필요한 정보를 전달합니다.
      </p>
    </div>
  )
}

function GuideSection() {
  const guides = [
    {
      title: '주로 생활하시는 공간에 설치해 주세요.',
      text: '거실이나 주방처럼 자주 머무는 공간에 설치하면 안정적으로 작동합니다.',
      icon: '🛋️',
    },
    {
      title: '센서 앞을 막는 장애물이 없어야 합니다.',
      text: '센서 방향 앞에는 큰 물건을 두지 않는 것이 좋습니다.',
      icon: '⚠️',
    },
    {
      title: 'TV의 전자 제품을 가급적 피해 주세요.',
      text: '전자제품과 너무 가까우면 감지 성능이 떨어질 수 있습니다.',
      icon: '📺',
    },
    {
      title: '항상 전원을 연결해 주세요.',
      text: '안정적인 돌봄을 위해 전원 연결 상태를 유지해 주세요.',
      icon: '🔌',
    },
  ]

  return (
    <section id="guide" className="bg-blue-50 py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="text-center text-4xl font-black text-slate-950">
          올바른 안심지키미 사용 방법
        </h2>
        <p className="mt-4 text-center text-xl text-slate-600">
          어르신도 쉽게 이해할 수 있도록 간단하고 명확하게 안내합니다.
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
  const services = [
    {
      icon: '🤖',
      title: 'AI 채팅 파트너',
      text: '외로운 순간에도 편하게 대화할 수 있는 AI 친구입니다.',
    },
    {
      icon: '📘',
      title: 'AI 데일리 노트',
      text: '말로 남긴 하루를 자동으로 정리해 줍니다.',
    },
    {
      icon: '📖',
      title: '자동 자서전 생성',
      text: '데일리 노트를 바탕으로 인생 이야기를 책처럼 만듭니다.',
    },
    {
      icon: '💙',
      title: '건강 리포트',
      text: '일상 변화와 건강 패턴을 보기 쉽게 알려줍니다.',
    },
  ]

  return (
    <section id="ai" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="text-center text-4xl font-black text-slate-950">
          AI가 더 따뜻한 돌봄을 만듭니다
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="text-5xl">{service.icon}</div>
              <h3 className="mt-6 text-2xl font-black text-slate-950">
                {service.title}
              </h3>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                {service.text}
              </p>
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
              ♡
            </div>
            <span className="text-2xl font-black">안심지키미</span>
          </div>
          <p className="mt-5 text-base leading-7 text-slate-300">
            이용약관 · 개인정보처리방침 · 고객센터
            <br />
            대표번호 010.3422.5807 · help@ansim.co.kr
            <br />
            Copyright © 2026 안심지키미. All rights reserved.
          </p>
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
        <a className="flex flex-col items-center justify-center gap-1 text-blue-600">
          <span className="text-2xl">🏠</span>
          홈
        </a>
        <a className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">🎙️</span>
          기록
        </a>
        <a className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">🤖</span>
          AI
        </a>
        <a className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">❤️</span>
          건강
        </a>
        <a className="flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">👤</span>
          내 정보
        </a>
      </div>
    </nav>
  )
}

export default Home