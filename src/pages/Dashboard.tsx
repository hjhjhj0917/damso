function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-black text-slate-950">
            안심지키미 메인 서비스
          </h1>

          <p className="mt-4 text-xl font-bold text-slate-600">
            로그인에 성공했습니다.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl bg-blue-50 p-6">
              <div className="text-4xl">🤖</div>
              <h2 className="mt-4 text-2xl font-black text-blue-700">
                AI 채팅 파트너
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-600">
                오늘 하루를 AI와 편하게 이야기해보세요.
              </p>
            </div>

            <div className="rounded-3xl bg-blue-50 p-6">
              <div className="text-4xl">📘</div>
              <h2 className="mt-4 text-2xl font-black text-blue-700">
                AI 데일리 노트
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-600">
                음성으로 기록한 하루를 자동으로 정리합니다.
              </p>
            </div>

            <div className="rounded-3xl bg-blue-50 p-6">
              <div className="text-4xl">📖</div>
              <h2 className="mt-4 text-2xl font-black text-blue-700">
                자동 자서전 생성
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-600">
                데일리 노트를 바탕으로 인생 이야기를 정리합니다.
              </p>
            </div>

            <div className="rounded-3xl bg-blue-50 p-6">
              <div className="text-4xl">💙</div>
              <h2 className="mt-4 text-2xl font-black text-blue-700">
                건강 리포트
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-600">
                생활 패턴과 건강 변화를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Dashboard