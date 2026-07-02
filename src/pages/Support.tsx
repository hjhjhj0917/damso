import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { loadStored } from '../utils/appData'

type SupportTab = 'faq' | 'privacy' | 'inquiry' | 'chatbot'
type InquiryStatus = '접수완료' | '답변중' | '답변완료'
type Inquiry = {
  id: number
  category: string
  title: string
  content: string
  createdAt: string
  status: InquiryStatus
  answer?: string
}
type ChatMessage = { id: number; role: 'bot' | 'user'; text: string }

const tabs: Array<{ id: SupportTab; label: string; icon: string; description: string }> = [
  { id: 'faq', label: '자주 묻는 질문', icon: '？', description: '빠르게 답을 찾아보세요' },
  { id: 'privacy', label: '개인정보 처리방침', icon: '▣', description: '정보 보호 기준을 확인하세요' },
  { id: 'inquiry', label: '1:1 문의', icon: '✉', description: '문의 접수와 답변 내역' },
  { id: 'chatbot', label: '챗봇 문의', icon: '✦', description: '24시간 바로 물어보세요' },
]

const faqs = [
  { category: '서비스 이용', question: '도담은 어떤 이야기를 기록하나요?', answer: '피보호인이 도담과 나눈 음성·문자 대화 중 일상, 기분, 건강 관련 내용을 데일리노트와 건강 기록으로 정리합니다. 원하지 않는 기록은 데일리노트에서 확인 후 삭제할 수 있습니다.' },
  { category: '보호자 연결', question: '보호자는 피보호인의 모든 대화를 볼 수 있나요?', answer: '아니요. 보호자는 피보호인이 동의한 범위의 데일리노트 요약, 건강 리포트와 일정만 확인할 수 있습니다. 원문 대화 전체가 자동 공개되지는 않습니다.' },
  { category: '건강 리포트', question: '건강 리포트가 의료진의 진단을 대신하나요?', answer: '건강 리포트는 생활 기록을 바탕으로 한 참고 정보이며 의료진의 진단을 대신하지 않습니다. 이상 신호가 있거나 증상이 지속되면 의료기관의 진료를 받아야 합니다.' },
  { category: '병원 예약', question: '병원 예약을 취소하거나 변경할 수 있나요?', answer: '일정 캘린더에서 예약 내용을 확인한 뒤 병원 또는 담소 고객센터를 통해 변경할 수 있습니다. 실제 예약 확정 여부는 해당 의료기관의 안내를 기준으로 합니다.' },
  { category: '계정', question: '피보호인 계정은 나중에 연결해도 되나요?', answer: '네. 보호자 회원가입 때 ‘나중에 등록하기’를 선택한 뒤 마이페이지의 ‘피보호인 계정 연동하기’에서 본인확인 후 연결할 수 있습니다.' },
  { category: '개인정보', question: '회원탈퇴를 하면 기록은 어떻게 되나요?', answer: '탈퇴 시 관계 법령에 따라 보존해야 하는 정보를 제외한 계정, 대화, 데일리노트와 건강 기록을 지체 없이 파기합니다. 법정 보존 정보는 분리 보관 후 기간이 지나면 파기합니다.' },
  { category: '음성 이용', question: '음성으로 말하기 어려운 경우에도 이용할 수 있나요?', answer: '네. AI 파트너 화면에서 문자로도 대화할 수 있으며, 음성과 문자를 섞어서 사용해도 하나의 하루 기록으로 정리됩니다.' },
]

const initialInquiries: Inquiry[] = [
  { id: 1002, category: '병원 예약', title: '예약 시간을 변경하고 싶어요', content: '7월 3일 오후 예약을 오전으로 변경할 수 있을까요?', createdAt: '2026.07.01', status: '답변완료', answer: '늘봄내과에 확인한 결과 오전 11시로 변경 가능합니다. 일정 캘린더에도 변경된 시간이 반영되었습니다.' },
  { id: 1001, category: '건강 리포트', title: '안심 지수는 어떻게 계산되나요?', content: '건강 리포트의 안심 지수 기준이 궁금합니다.', createdAt: '2026.06.29', status: '답변중' },
]

function Support() {
  const [activeTab, setActiveTab] = useState<SupportTab>('faq')

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black tracking-[0.16em] text-blue-600">DAMSO HELP CENTER</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">무엇을 도와드릴까요?</h1>
              <p className="mt-4 text-lg text-slate-500">서비스 이용부터 개인정보 보호까지, 필요한 답을 편하게 찾아보세요.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-blue-50 px-5 py-4"><p className="text-xs font-black text-blue-600">대표 고객센터</p><a href="tel:00000000" className="mt-1 block text-2xl font-black text-slate-900">0000-0000</a></div>
              <div className="rounded-2xl bg-slate-100 px-5 py-4"><p className="text-xs font-black text-slate-500">상담 시간</p><p className="mt-1 font-black text-slate-800">평일 09:00–18:00</p><p className="text-xs text-slate-400">주말·공휴일 휴무</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[260px_1fr] lg:py-12">
        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24">
          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition sm:p-4 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black ${activeTab === tab.id ? 'bg-white/15' : 'bg-slate-100 text-blue-600'}`}>{tab.icon}</span><span className="min-w-0"><b className="block text-sm">{tab.label}</b><span className={`mt-0.5 hidden text-[11px] lg:block ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'}`}>{tab.description}</span></span></button>)}</nav>
          <div className="mt-3 hidden rounded-2xl bg-slate-50 p-4 lg:block"><p className="text-xs font-black text-slate-500">긴급한 상황인가요?</p><p className="mt-2 text-xs leading-5 text-slate-400">응급 증상이나 즉각적인 도움이 필요하면 119에 연락하세요.</p><a href="tel:119" className="mt-3 inline-flex text-sm font-black text-red-500">119 바로 연결 →</a></div>
        </aside>

        <section className="min-w-0">
          {activeTab === 'faq' && <FaqView onInquiry={() => setActiveTab('inquiry')} />}
          {activeTab === 'privacy' && <PrivacyView />}
          {activeTab === 'inquiry' && <InquiryView />}
          {activeTab === 'chatbot' && <ChatbotView onInquiry={() => setActiveTab('inquiry')} />}
        </section>
      </div>
    </main>
  )
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-xs font-black tracking-[0.14em] text-blue-600">{eyebrow}</p><h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>
}

function FaqView({ onInquiry }: { onInquiry: () => void }) {
  const [openIndex, setOpenIndex] = useState(0)
  const [query, setQuery] = useState('')
  const filtered = faqs.filter((faq) => `${faq.category}${faq.question}${faq.answer}`.includes(query))

  return <div>
    <SectionTitle eyebrow="FAQ" title="자주 묻는 질문" description="많이 궁금해하시는 내용을 먼저 모았습니다." />
    <div className="relative mb-5"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-slate-400">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="궁금한 내용을 검색해 보세요" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-5 font-bold outline-none focus:border-blue-500" /></div>
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">{filtered.map((faq) => { const originalIndex = faqs.indexOf(faq); const open = openIndex === originalIndex; return <div key={faq.question} className="border-b border-slate-100 last:border-0"><button onClick={() => setOpenIndex(open ? -1 : originalIndex)} className="flex w-full items-center gap-4 p-5 text-left sm:p-6"><span className="text-lg font-black text-blue-600">Q</span><span className="min-w-0 flex-1"><span className="mb-1 block text-xs font-black text-slate-400">{faq.category}</span><b className="text-base text-slate-800 sm:text-lg">{faq.question}</b></span><span className={`text-2xl text-slate-400 transition ${open ? 'rotate-45' : ''}`}>＋</span></button>{open && <div className="bg-blue-50/60 px-5 py-5 sm:px-6"><div className="flex gap-4"><span className="text-lg font-black text-blue-600">A</span><p className="text-sm leading-7 text-slate-600 sm:text-base">{faq.answer}</p></div></div>}</div>})}{filtered.length === 0 && <div className="p-14 text-center text-slate-400">검색 결과가 없습니다.</div>}</div>
    <div className="mt-6 rounded-2xl bg-slate-900 p-6 text-white sm:flex sm:items-center sm:justify-between"><div><h3 className="font-black">원하는 답변을 찾지 못하셨나요?</h3><p className="mt-1 text-sm text-slate-300">1:1 문의를 남기면 담당자가 확인 후 답변해 드립니다.</p></div><button onClick={onInquiry} className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 sm:mt-0">1:1 문의하기</button></div>
  </div>
}

function PrivacyView() {
  return <article>
    <SectionTitle eyebrow="PRIVACY POLICY" title="개인정보 처리방침" description="담소는 개인정보 보호법 등 관계 법령에 따라 개인정보를 안전하게 처리합니다." />
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><b>시행 전 확인 안내</b><p className="mt-1">본 방침은 2026년 7월 2일 기준 서비스 설계를 반영한 초안입니다. 정식 출시 전 실제 법인정보, 수탁사, 서버 위치와 본인확인 방식을 확정한 후 개인정보 보호책임자 및 법률 전문가의 최종 검토를 거쳐야 합니다.</p></div>
    <div className="space-y-5">
      <PolicySection number="01" title="개인정보의 처리 목적"><p>담소는 회원가입 및 본인확인, AI 파트너 대화 제공, 데일리노트·자서전·건강 리포트 생성, 피보호인과 보호자 계정 연결, 건강 이상 신호 안내, 병원 예약 및 상담 연결, 고객 문의 처리와 서비스 안전성 개선을 위해 개인정보를 처리합니다. 목적이 변경될 경우 관계 법령에 따라 별도 동의를 받거나 필요한 조치를 합니다.</p></PolicySection>
      <PolicySection number="02" title="처리하는 개인정보 항목"><DataTable rows={[
        ['회원가입·본인확인', '필수: 아이디, 비밀번호, 성명, 휴대전화번호, 통신사, 본인확인 결과(CI/DI 등). 시연 화면의 주민등록번호 입력값은 정식 서비스에서 본인확인기관을 통해 처리하고 회사가 원문을 저장하지 않는 방식으로 전환합니다.'],
        ['피보호인 연결', '피보호인 성명, 휴대전화번호, 보호자와의 관계, 계정 연결 동의 및 인증 결과'],
        ['AI 돌봄 서비스', '채팅·음성 기록, 데일리노트, 일정, 복약·수면·활동 및 이용자가 직접 제공한 건강 관련 정보'],
        ['병원 예약', '예약자 성명, 연락처, 예약 일시·의료기관, 예약에 필요한 최소 건강정보'],
        ['고객센터', '문의 유형, 제목, 내용, 처리 내역, 첨부정보(선택)'],
        ['자동 수집', '접속기록, IP주소, 브라우저·기기정보, 쿠키 또는 로컬 저장소 이용 기록'],
      ]} /></PolicySection>
      <PolicySection number="03" title="민감정보 및 고유식별정보의 처리"><p>건강정보와 음성 등 민감정보는 건강 리포트와 맞춤형 케어 제공에 필요한 범위를 명확히 알리고 별도 동의를 받아 처리합니다. 주민등록번호는 법령상 허용되는 경우를 제외하고 직접 수집·저장하지 않으며, 본인확인기관이 제공하는 연계정보와 인증 결과를 이용합니다. AI 분석 결과는 의료적 진단이 아닙니다.</p></PolicySection>
      <PolicySection number="04" title="처리 및 보유 기간"><DataTable rows={[
        ['회원정보', '회원탈퇴 시까지. 관계 법령상 보존 의무가 있는 경우 해당 기간까지 분리 보관'],
        ['대화·데일리노트·건강기록', '회원탈퇴 또는 이용자의 삭제 요청 시까지'],
        ['피보호인 연결정보', '연결 해제 또는 회원탈퇴 시까지'],
        ['1:1 문의', '처리 완료 후 3년. 전자상거래법 적용 대상 소비자 불만·분쟁 기록은 법정기간 보관'],
        ['접속기록', '관련 법령 및 보안정책에 따른 기간'],
      ]} /></PolicySection>
      <PolicySection number="05" title="개인정보의 제3자 제공"><p>담소는 원칙적으로 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 병원 예약 또는 전문가 상담을 요청한 경우에 한해 이용자에게 제공받는 자, 목적, 항목과 보유기간을 알리고 별도 동의를 받은 후 해당 의료기관·상담기관에 최소 정보를 제공합니다. 법률에 특별한 규정이 있는 경우는 예외로 합니다.</p></PolicySection>
      <PolicySection number="06" title="개인정보 처리의 위탁 및 국외 이전"><p>현재 시연 서비스에는 외부 개인정보 처리 수탁사가 연결되어 있지 않습니다. 정식 서비스에서 클라우드, 본인확인, 문자·알림톡, 음성인식 또는 고객상담 업무를 위탁하는 경우 수탁자와 위탁업무를 이 페이지에 공개하고 안전한 처리를 감독합니다. 국외 이전이 발생하는 경우 이전 국가·항목·시점·방법·보유기간과 거부 방법을 사전에 공개합니다.</p></PolicySection>
      <PolicySection number="07" title="개인정보의 파기"><p>보유기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다. 전자파일은 복구할 수 없는 방법으로 삭제하고, 종이 문서는 분쇄 또는 소각합니다. 법령에 따라 보존해야 하는 정보는 별도 데이터베이스 또는 장소에 분리 보관합니다.</p></PolicySection>
      <PolicySection number="08" title="정보주체와 법정대리인의 권리"><p>이용자는 개인정보의 열람, 정정·삭제, 처리정지, 동의 철회와 전송을 요구할 수 있습니다. 보호자가 피보호인을 대신하여 요구하는 경우 정당한 대리권과 본인 여부를 확인할 수 있습니다. 앱의 마이페이지 또는 개인정보 담당부서를 통해 요청할 수 있으며 법정 기한 안에 결과를 안내합니다.</p></PolicySection>
      <PolicySection number="09" title="자동화된 결정과 AI 분석"><p>도담은 대화와 생활 기록을 분석해 건강 리포트와 관리 제안을 생성하지만, 이용자의 권리나 의무에 중대한 영향을 미치는 결정을 AI만으로 확정하지 않습니다. 이용자는 AI 분석에 대한 설명을 요청하거나 해당 분석의 적용을 거부할 수 있으며, 필요한 경우 담당자의 검토를 요청할 수 있습니다.</p></PolicySection>
      <PolicySection number="10" title="안전성 확보 조치"><p>개인정보취급자 최소화와 교육, 내부관리계획 수립, 접근권한 관리, 전송·저장 구간 암호화, 접속기록 보관과 위·변조 방지, 보안프로그램 운영, 정기 취약점 점검 및 물리적 접근통제를 시행합니다.</p></PolicySection>
      <PolicySection number="11" title="개인정보 보호책임자 및 권익침해 구제"><p><b>담소 개인정보보호 담당부서</b><br />전화: 0000-0000 · 이메일: privacy@damso.co.kr</p><p className="mt-3">개인정보 침해 상담은 개인정보침해 신고센터(국번 없이 118) 또는 개인정보분쟁조정위원회(1833-6972)를 이용할 수 있습니다.</p></PolicySection>
      <PolicySection number="12" title="처리방침의 변경"><p>이 처리방침은 2026년 7월 2일부터 적용합니다. 내용이 변경되는 경우 시행 최소 7일 전, 이용자 권리에 중대한 변경은 최소 30일 전에 공지합니다. 이전 처리방침도 쉽게 확인할 수 있도록 제공합니다.</p></PolicySection>
    </div>
    <div className="mt-6 flex flex-wrap gap-3 text-sm font-black"><a href="https://www.law.go.kr/법령/개인정보보호법" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-blue-600">개인정보 보호법 확인 ↗</a><a href="https://www.pipc.go.kr" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-blue-600">개인정보보호위원회 ↗</a></div>
  </article>
}

function PolicySection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-start gap-4"><span className="font-black text-blue-600">{number}</span><div className="min-w-0 flex-1"><h3 className="text-xl font-black text-slate-900">{title}</h3><div className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{children}</div></div></div></section>
}

function DataTable({ rows }: { rows: string[][] }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200">{rows.map(([label, value]) => <div key={label} className="grid border-b border-slate-100 last:border-0 sm:grid-cols-[150px_1fr]"><b className="bg-slate-50 px-4 py-3 text-sm text-slate-700">{label}</b><p className="px-4 py-3 text-sm leading-6">{value}</p></div>)}</div>
}

function InquiryView() {
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => loadStored('damsoInquiries', initialInquiries))
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [category, setCategory] = useState('서비스 이용')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  useEffect(() => localStorage.setItem('damsoInquiries', JSON.stringify(inquiries)), [inquiries])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || content.trim().length < 10) return
    const inquiry: Inquiry = { id: Date.now(), category, title: title.trim(), content: content.trim(), createdAt: new Date().toLocaleDateString('ko-KR').replaceAll(' ', ''), status: '접수완료' }
    setInquiries((value) => [inquiry, ...value]); setTitle(''); setContent(''); setShowForm(false); setSelected(inquiry)
  }

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><SectionTitle eyebrow="1:1 INQUIRY" title="1:1 문의" description="문의 접수와 담당자의 답변 상태를 한곳에서 확인하세요." /><button onClick={() => setShowForm(!showForm)} className="mb-7 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200">{showForm ? '문의내역 보기' : '새 문의 작성'}</button></div>
    {showForm ? <form onSubmit={submit} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><label className="block"><span className="mb-2 block text-sm font-black">문의 카테고리</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-13 w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500">{['서비스 이용','계정·피보호인 연동','AI 대화·기록','건강 리포트','병원 예약','개인정보','결제·환불','기타'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-5 block"><span className="mb-2 block text-sm font-black">제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="문의 제목을 입력하세요" className="h-13 w-full rounded-xl border-2 border-slate-200 px-4 font-bold outline-none focus:border-blue-500" /></label><label className="mt-5 block"><span className="mb-2 block text-sm font-black">문의 내용</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="문의하실 내용을 10자 이상 자세히 적어주세요." rows={7} className="w-full resize-none rounded-xl border-2 border-slate-200 p-4 font-medium leading-7 outline-none focus:border-blue-500" /></label><p className="mt-2 text-right text-xs font-bold text-slate-400">{content.length}자</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-slate-100 px-5 py-3 font-black">취소</button><button disabled={!title.trim() || content.trim().length < 10} className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white disabled:bg-slate-300">문의 접수</button></div></form> : <div className="space-y-3">{inquiries.map((inquiry) => <button key={inquiry.id} onClick={() => setSelected(inquiry)} className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center"><span className="min-w-0 flex-1"><span className="text-xs font-black text-blue-600">{inquiry.category}</span><b className="mt-1 block truncate text-lg">{inquiry.title}</b><span className="mt-2 block text-xs text-slate-400">문의번호 {inquiry.id} · {inquiry.createdAt}</span></span><StatusBadge status={inquiry.status} /><span className="hidden text-xl text-slate-300 sm:block">›</span></button>)}{inquiries.length === 0 && <div className="rounded-2xl bg-white p-14 text-center text-slate-400">아직 문의내역이 없습니다.</div>}</div>}
    {selected && <SupportModal onClose={() => setSelected(null)}><div className="flex items-center gap-2"><span className="text-sm font-black text-blue-600">{selected.category}</span><StatusBadge status={selected.status} /></div><h3 className="mt-3 pr-10 text-2xl font-black">{selected.title}</h3><p className="mt-2 text-xs text-slate-400">문의번호 {selected.id} · {selected.createdAt}</p><div className="mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-slate-400">문의 내용</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{selected.content}</p></div>{selected.answer ? <div className="mt-4 rounded-2xl bg-blue-50 p-5"><p className="text-xs font-black text-blue-600">담소 고객센터 답변</p><p className="mt-2 text-sm leading-7 text-slate-700">{selected.answer}</p></div> : <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="font-black text-amber-800">담당자가 문의를 확인하고 있습니다.</p><p className="mt-1 text-sm text-amber-700">답변이 등록되면 알림으로 알려드릴게요.</p></div>}<button onClick={() => setSelected(null)} className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-black text-white">확인</button></SupportModal>}
  </div>
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const colors: Record<InquiryStatus, string> = { 접수완료: 'bg-slate-100 text-slate-600', 답변중: 'bg-amber-100 text-amber-700', 답변완료: 'bg-emerald-100 text-emerald-700' }
  return <span className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${colors[status]}`}>{status}</span>
}

function ChatbotView({ onInquiry }: { onInquiry: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, role: 'bot', text: '안녕하세요. 담소 고객센터 챗봇이에요. 서비스 이용, 계정 연결, 건강 리포트나 병원 예약에 대해 물어보세요.' }])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages])
  const respond = (text: string) => {
    if (text.includes('연동') || text.includes('연결')) return '보호자 계정의 마이페이지에서 ‘피보호인 계정 연동하기’를 선택한 뒤 피보호인 정보로 인증하면 연결할 수 있어요.'
    if (text.includes('예약') || text.includes('병원')) return '건강 리포트의 병원 예약 버튼에서 가능한 시간을 선택할 수 있어요. 완료된 예약은 일정 캘린더에 자동으로 등록됩니다.'
    if (text.includes('건강') || text.includes('리포트')) return '건강 리포트는 대화와 생활 기록을 바탕으로 만든 참고 정보예요. 증상이 있거나 이상 신호가 지속되면 의료진의 진료를 받아주세요.'
    if (text.includes('탈퇴') || text.includes('개인정보')) return '개인정보 확인·수정·탈퇴는 마이페이지에서 할 수 있어요. 자세한 처리 기준은 고객센터의 개인정보 처리방침에서 확인할 수 있습니다.'
    return '말씀하신 내용을 정확히 확인하려면 1:1 문의로 남겨주세요. 담당자가 내용을 살펴보고 답변해 드릴게요.'
  }
  const send = (text: string) => { if (!text.trim()) return; setMessages((value) => [...value, { id: Date.now(), role: 'user', text: text.trim() }]); setInput(''); window.setTimeout(() => setMessages((value) => [...value, { id: Date.now() + 1, role: 'bot', text: respond(text) }]), 350) }

  return <div>
    <SectionTitle eyebrow="CHATBOT" title="챗봇 문의" description="간단한 질문은 24시간 바로 답을 확인할 수 있어요." />
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"><div className="flex items-center border-b border-slate-100 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">✦</span><div className="ml-3"><b className="block">담소 상담봇</b><span className="text-xs font-bold text-emerald-600">● 상담 가능</span></div><button onClick={onInquiry} className="ml-auto rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">1:1 문의 전환</button></div><div className="h-[430px] overflow-y-auto bg-slate-50 p-5">{messages.map((message) => <div key={message.id} className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-600 shadow-sm'}`}>{message.text}</div></div>)}<div ref={bottomRef} /></div><div className="border-t border-slate-100 p-4"><div className="mb-3 flex gap-2 overflow-x-auto">{['피보호인 연동 방법','병원 예약 확인','건강 리포트 안내','회원탈퇴 방법'].map((item) => <button key={item} onClick={() => send(item)} className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">{item}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); send(input) }} className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="궁금한 내용을 입력하세요" className="h-13 min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-4 outline-none focus:border-blue-500" /><button className="rounded-xl bg-blue-600 px-5 font-black text-white">전송</button></form></div></div>
    <p className="mt-4 text-center text-xs text-slate-400">챗봇 답변은 일반적인 안내이며 의료·법률 상담을 대신하지 않습니다.</p>
  </div>
}

function SupportModal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"><div className="relative w-full max-w-xl rounded-[1.75rem] bg-white p-7 shadow-2xl"><button onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">×</button>{children}</div></div>
}

export default Support
