import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AUTH_INPUT_CLASS,
  EMAIL_PATTERN,
  RESIDENT_BACK_PATTERN,
  RESIDENT_FRONT_PATTERN,
  normalizeId,
  normalizePhone,
  residentToBirthDate,
  useEmailVerification,
  type AccountType,
} from '../components/authShared'
import { checkIdExists, errorMessage, signup, signupSendCode, signupVerify } from '../utils/api'

type CheckStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'invalid'

const USER_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/

function Signup() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>('user')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [residentFront, setResidentFront] = useState('')
  const [residentBackFirst, setResidentBackFirst] = useState('')
  const [phone, setPhone] = useState('')
  /**
   * 이메일 인증. 아이디 찾기·비밀번호 재설정이 쓰는 훅을 그대로 씁니다 — 부르는 엔드포인트만
   * 다르고, 발송 여부·확인 여부·에러 문구를 다루는 방식은 세 화면이 똑같아야 합니다.
   *
   * 주소를 고치면 훅이 인증 상태를 스스로 되돌립니다. 서버도 같은 판단을 하므로(인증된 주소와
   * 가입 요청의 주소가 다르면 EMAIL_NOT_VERIFIED) 둘이 어긋날 일이 없습니다.
   */
  const verification = useEmailVerification({ onSend: signupSendCode, onVerify: signupVerify })
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasGuardedHistoryRef = useRef(false)

  useEffect(() => {
    // React StrictMode에서 effect가 두 번 실행돼도 더미 히스토리 항목이 중복 추가되지 않도록 방지합니다.
    if (!hasGuardedHistoryRef.current) {
      window.history.pushState(null, '', window.location.href)
      hasGuardedHistoryRef.current = true
    }
    const handlePopState = () => {
      const leave = window.confirm(
        '현재 작성중인 정보가 저장되지 않습니다. 정말로 나가시겠습니까?',
      )
      if (leave) {
        window.removeEventListener('popstate', handlePopState)
        window.history.go(-1)
      } else {
        window.history.pushState(null, '', window.location.href)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleDuplicateCheck = async () => {
    setError('')
    const normalizedUserId = normalizeId(userId)
    if (!USER_ID_PATTERN.test(normalizedUserId)) {
      setCheckStatus('invalid')
      return
    }

    setCheckStatus('checking')
    const result = await checkIdExists(normalizedUserId)
    if (result.status !== 'success') {
      setCheckStatus('idle')
      setError(errorMessage(result))
      return
    }
    setCheckStatus(result.data?.exists ? 'duplicate' : 'available')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (checkStatus !== 'available') {
      setError('아이디 중복확인을 완료해 주세요.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (name.trim().length < 2) {
      setError('이름을 2자 이상 입력해 주세요.')
      return
    }
    if (!RESIDENT_FRONT_PATTERN.test(residentFront) || !RESIDENT_BACK_PATTERN.test(residentBackFirst)) {
      setError('주민등록번호를 정확히 입력해 주세요.')
      return
    }
    const birthDate = residentToBirthDate(residentFront, residentBackFirst)
    if (!birthDate) {
      setError('주민등록번호를 정확히 입력해 주세요.')
      return
    }
    const normalizedPhone = normalizePhone(phone)
    if (!/^01[016789]\d{7,8}$/.test(normalizedPhone)) {
      setError('올바른 전화번호를 입력해 주세요.')
      return
    }
    if (!EMAIL_PATTERN.test(verification.email.trim())) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return
    }
    if (!verification.isVerified) {
      setError('이메일 인증을 완료해 주세요.')
      return
    }

    setIsSubmitting(true)
    const result = await signup({
      id: normalizeId(userId),
      password,
      name: name.trim(),
      phone: normalizedPhone,
      email: verification.email.trim().toLowerCase(),
      roles: accountType === 'guardian' ? 'GUARDIAN' : 'USER',
      birthDate,
    })
    setIsSubmitting(false)

    if (result.status !== 'success') {
      // 중복확인을 통과한 뒤 다른 사람이 먼저 그 아이디로 가입했을 수 있다. 그때는
      // 확인 상태를 되돌려 다시 확인하게 한다.
      if (result.code === 'DUPLICATE_ID') setCheckStatus('duplicate')
      // 인증이 만료됐거나(세션 10분) 그 사이 주소가 바뀐 경우다. 발송부터 다시 하게 되돌린다.
      if (result.code === 'EMAIL_NOT_VERIFIED') verification.resetVerification()
      setError(errorMessage(result))
      return
    }

    alert(`${accountType === 'guardian' ? '보호자' : '사용자'} 계정 회원가입이 완료되었습니다. 로그인 후 이용해 주세요.`)
    navigate('/?login=true')
  }

  return (
    /*
      lg에서는 이 화면이 딱 한 번만 스크롤됩니다 — 오른쪽 입력 영역 안에서.

      높이를 lg:h-screen으로 두면 위의 헤더(Header.tsx의 h-20 = 5rem, 아래 테두리 1px)만큼
      문서가 넘쳐 브라우저 오른쪽 끝에 페이지 스크롤바가 하나 더 생깁니다. 그 둘은 같이
      움직이기 때문에, 폼만 굴리려고 안쪽에 스크롤을 둔 의도가 사라집니다. 그래서 화면에서
      헤더를 뺀 나머지를 정확히 차지하게 하고, 넘치는 부분은 안쪽에서만 처리합니다.
    */
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 px-5 py-12 lg:h-[calc(100vh_-_5rem_-_1px)] lg:min-h-0 lg:overflow-hidden lg:py-0">
      <section className="mx-auto grid max-w-6xl items-center gap-10 lg:h-full lg:grid-cols-[1fr_520px] lg:grid-rows-1">
        {/* 왼쪽 소개 영역은 화면 중앙에 고정하고, 스크롤은 오른쪽 입력 영역에서만 일어나게 합니다. */}
        <div className="hidden min-h-0 lg:block">
          <div className="rounded-[3rem] bg-white/80 p-10 shadow-xl">
            <div className="inline-flex rounded-full bg-blue-100 px-5 py-3 text-lg font-black text-blue-700">간편 회원가입</div>
            <h1 className="mt-8 text-5xl font-black leading-tight text-slate-950">
              필요한 정보만 간단히,<br /><span className="text-blue-600">담소를 시작해 보세요.</span>
            </h1>
            <p className="mt-7 text-xl leading-9 text-slate-700">복잡한 휴대폰 본인인증 없이 기본 정보만으로 가입할 수 있어요.</p>
            <div className="mt-10 grid grid-cols-2 gap-5">
              <InfoCard icon="🌼" title="음성·문자 대화" />
              <InfoCard icon="📘" title="데일리노트" />
              <InfoCard icon="📖" title="나의 자서전" />
              <InfoCard icon="💙" title="건강 리포트" />
            </div>
          </div>
        </div>

        <div className="lg:min-h-0 lg:self-stretch lg:overflow-y-auto lg:py-12 lg:no-scrollbar">
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
            <div className="mb-8 text-center">
              <img src="/logo.svg" alt="담소" className="mx-auto h-16 w-16 rounded-3xl shadow-lg" />
              <h2 className="mt-5 text-4xl font-black text-slate-950">회원가입</h2>
              <p className="mt-3 text-lg text-slate-600">기본 정보만 입력하면 가입이 완료됩니다.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-lg font-extrabold text-slate-800">가입할 계정 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setAccountType('user'); setError('') }}
                    className={`rounded-2xl border-2 p-4 text-left transition ${accountType === 'user' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    <span className="text-2xl">👵🏻</span>
                    <b className="mt-2 block text-lg">사용자 계정</b>
                    <span className="mt-1 block text-xs leading-5">담소 서비스를 직접 이용해요</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAccountType('guardian'); setError('') }}
                    className={`rounded-2xl border-2 p-4 text-left transition ${accountType === 'guardian' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    <span className="text-2xl">👨‍👩‍👧</span>
                    <b className="mt-2 block text-lg">보호자 계정</b>
                    <span className="mt-1 block text-xs leading-5">가족의 기록과 건강을 살펴봐요</span>
                  </button>
                </div>
                {accountType === 'guardian' && (
                  <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-700">
                    가입 후 마이페이지에서 피보호인 계정을 연결할 수 있습니다.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">아이디</label>
                <div className="relative">
                  <input value={userId} onChange={(event) => { setUserId(event.target.value); setCheckStatus('idle'); setError('') }} placeholder="영문, 숫자, 밑줄 4~20자" className={`${AUTH_INPUT_CLASS} pr-32`} />
                  <button type="button" onClick={handleDuplicateCheck} disabled={checkStatus === 'checking'} className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-blue-600 px-5 font-black text-white disabled:bg-slate-300">{checkStatus === 'checking' ? '확인 중' : '중복확인'}</button>
                </div>
                {checkStatus === 'invalid' && <Message error>영문, 숫자, 밑줄로 4~20자 입력해 주세요.</Message>}
                {checkStatus === 'duplicate' && <Message error>이미 사용 중인 아이디입니다.</Message>}
                {checkStatus === 'available' && <Message>사용 가능한 아이디입니다.</Message>}
              </div>

              <Field label="비밀번호"><input value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} type="password" placeholder="8자 이상 입력하세요" className={AUTH_INPUT_CLASS} /></Field>
              <Field label="비밀번호 확인">
                <input value={passwordConfirm} onChange={(event) => { setPasswordConfirm(event.target.value); setError('') }} type="password" placeholder="비밀번호를 다시 입력하세요" className={AUTH_INPUT_CLASS} />
                {passwordConfirm.length > 0 && password !== passwordConfirm && <Message error>비밀번호가 일치하지 않습니다.</Message>}
              </Field>
              <Field label="이름"><input value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="이름을 입력하세요" className={AUTH_INPUT_CLASS} /></Field>
              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">주민등록번호</label>
                <div className="flex items-center gap-2">
                  <input
                    value={residentFront}
                    onChange={(event) => { setResidentFront(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                    inputMode="numeric"
                    placeholder="앞 6자리"
                    className={`${AUTH_INPUT_CLASS} min-w-0 flex-1`}
                  />
                  <span className="font-black text-slate-400">-</span>
                  <div className={`${AUTH_INPUT_CLASS} flex min-w-0 flex-1 items-center`}>
                    <input
                      value={residentBackFirst}
                      onChange={(event) => { setResidentBackFirst(event.target.value.replace(/\D/g, '').slice(0, 1)); setError('') }}
                      inputMode="numeric"
                      placeholder="1"
                      className="w-6 bg-transparent font-semibold outline-none"
                    />
                    <span className="ml-1 font-black tracking-[0.12em] text-slate-400">******</span>
                  </div>
                </div>
              </div>
              <Field label="전화번호"><input value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 11)); setError('') }} type="tel" inputMode="numeric" placeholder="01012345678" className={AUTH_INPUT_CLASS} /></Field>

              {/*
                아이디 중복확인과 같은 모양입니다 — 입력칸 안쪽 오른쪽에 버튼을 얹고, 결과는
                칸 아래 한 줄로 알립니다. 두 칸이 하는 일(입력한 값을 서버에 물어보고 그
                답에 따라 다음으로 넘어간다)이 같으니 생김새도 같아야 합니다.
              */}
              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">이메일</label>
                <div className="relative">
                  <input
                    value={verification.email}
                    onChange={(event) => { verification.setEmail(event.target.value); setError('') }}
                    type="email"
                    placeholder="example@email.com"
                    className={`${AUTH_INPUT_CLASS} pr-40`}
                  />
                  <button
                    type="button"
                    onClick={() => { setError(''); void verification.requestAuth() }}
                    disabled={verification.isPending || verification.isVerified}
                    className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-blue-600 px-5 font-black text-white disabled:bg-slate-300"
                  >
                    {verification.isVerified ? '인증완료' : verification.isPending ? '처리 중' : verification.isAuthRequested ? '재발송' : '인증번호 발송'}
                  </button>
                </div>
                {verification.isVerified && <Message>이메일 인증이 완료되었습니다.</Message>}
                {verification.isAuthRequested && !verification.isVerified && <Message>메일로 보낸 6자리 번호를 10분 안에 입력해 주세요.</Message>}
                {verification.error && <Message error>{verification.error}</Message>}
              </div>

              {/* 발송 전에는 그리지 않습니다. 채울 수 없는 칸이 미리 보이면 무엇을 먼저 해야 하는지 흐려집니다. */}
              {verification.isAuthRequested && !verification.isVerified && (
                <div>
                  <label className="mb-2 block text-lg font-extrabold text-slate-800">인증번호</label>
                  <div className="relative">
                    <input
                      value={verification.authCode}
                      onChange={(event) => verification.setAuthCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      placeholder="123456"
                      className={`${AUTH_INPUT_CLASS} pr-24`}
                    />
                    <button
                      type="button"
                      onClick={() => void verification.verify()}
                      disabled={verification.isPending || verification.authCode.length < 6}
                      className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-slate-900 px-5 font-black text-white disabled:bg-slate-300"
                    >
                      확인
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="mt-8 h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300">{isSubmitting ? '가입 중…' : '회원가입 완료'}</button>
            <Link to="/" className="mt-4 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700">메인으로 돌아가기</Link>
          </form>
        </div>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-lg font-extrabold text-slate-800">{label}</label>{children}</div>
}

function Message({ error = false, children }: { error?: boolean; children: React.ReactNode }) {
  return <p className={`mt-3 text-base font-bold ${error ? 'text-red-600' : 'text-blue-600'}`}>{children}</p>
}

function InfoCard({ icon, title }: { icon: string; title: string }) {
  return <div className="rounded-3xl bg-blue-50 p-6 shadow-sm"><div className="text-4xl">{icon}</div><p className="mt-4 text-xl font-black text-slate-900">{title}</p></div>
}

export default Signup
