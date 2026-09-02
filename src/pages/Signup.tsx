import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AUTH_INPUT_CLASS,
  getSavedUsers,
  normalizeId,
  normalizePhone,
  saveSavedUsers,
  useEmailVerification,
  type AccountType,
  type SavedUser,
} from '../components/authShared'

type CheckStatus = 'idle' | 'available' | 'duplicate' | 'invalid'

const USER_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/

function Signup() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>('user')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [error, setError] = useState('')

  const verification = useEmailVerification({
    onBeforeSend: (email) =>
      getSavedUsers().some((user) => user.email?.toLowerCase() === email.toLowerCase())
        ? '이미 가입에 사용된 이메일입니다.'
        : null,
  })

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

  const handleDuplicateCheck = () => {
    setError('')
    const normalizedUserId = normalizeId(userId)
    if (!USER_ID_PATTERN.test(normalizedUserId)) {
      setCheckStatus('invalid')
      return
    }
    const isDuplicate = getSavedUsers().some(
      (user) => normalizeId(user.id) === normalizedUserId,
    )
    setCheckStatus(isDuplicate ? 'duplicate' : 'available')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
    if (name.trim().length < 2) {
      setError('이름을 2자 이상 입력해 주세요.')
      return
    }
    const normalizedPhone = normalizePhone(phone)
    if (!/^01[016789]\d{7,8}$/.test(normalizedPhone)) {
      setError('올바른 전화번호를 입력해 주세요.')
      return
    }
    if (!verification.isVerified) {
      setError('이메일 인증을 완료해 주세요.')
      return
    }

    const newUser: SavedUser = {
      id: normalizeId(userId),
      idType: 'username',
      password,
      name: name.trim(),
      phone: normalizedPhone,
      email: verification.email.trim().toLowerCase(),
      accountType,
    }
    saveSavedUsers([...getSavedUsers(), newUser])
    alert(`${accountType === 'guardian' ? '보호자' : '사용자'} 계정 회원가입이 완료되었습니다. 로그인 후 이용해 주세요.`)
    navigate('/?login=true')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 px-5 py-12">
      <section className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_520px]">
        <div className="hidden lg:block">
          <div className="rounded-[3rem] bg-white/80 p-10 shadow-xl">
            <div className="inline-flex rounded-full bg-blue-100 px-5 py-3 text-lg font-black text-blue-700">간편 회원가입</div>
            <h1 className="mt-8 text-5xl font-black leading-tight text-slate-950">
              필요한 정보만 간단히,<br /><span className="text-blue-600">담소를 시작해 보세요.</span>
            </h1>
            <p className="mt-7 text-xl leading-9 text-slate-700">복잡한 휴대폰 본인인증 없이 이메일 인증 한 번으로 가입할 수 있어요.</p>
            <div className="mt-10 grid grid-cols-2 gap-5">
              <InfoCard icon="🌼" title="음성·문자 대화" />
              <InfoCard icon="📘" title="데일리노트" />
              <InfoCard icon="📖" title="나의 자서전" />
              <InfoCard icon="💙" title="건강 리포트" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-8 text-center">
            <img src="/logo.svg" alt="담소" className="mx-auto h-16 w-16 rounded-3xl shadow-lg" />
            <h2 className="mt-5 text-4xl font-black text-slate-950">회원가입</h2>
            <p className="mt-3 text-lg text-slate-600">기본 정보와 이메일 인증만 완료해 주세요.</p>
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
                <button type="button" onClick={handleDuplicateCheck} className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-blue-600 px-5 font-black text-white">중복확인</button>
              </div>
              {checkStatus === 'invalid' && <Message error>영문, 숫자, 밑줄로 4~20자 입력해 주세요.</Message>}
              {checkStatus === 'duplicate' && <Message error>이미 사용 중인 아이디입니다.</Message>}
              {checkStatus === 'available' && <Message>사용 가능한 아이디입니다.</Message>}
            </div>

            <Field label="비밀번호"><input value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} type="password" placeholder="8자 이상 입력하세요" className={AUTH_INPUT_CLASS} /></Field>
            <Field label="이름"><input value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="이름을 입력하세요" className={AUTH_INPUT_CLASS} /></Field>
            <Field label="전화번호"><input value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 11)); setError('') }} type="tel" inputMode="numeric" placeholder="01012345678" className={AUTH_INPUT_CLASS} /></Field>

            <div>
              <label className="mb-2 block text-lg font-extrabold text-slate-800">이메일</label>
              <div className="flex gap-3">
                <input value={verification.email} onChange={(event) => verification.setEmail(event.target.value)} type="email" placeholder="example@email.com" className={`${AUTH_INPUT_CLASS} min-w-0 flex-1`} />
                <button type="button" onClick={verification.requestAuth} className="shrink-0 rounded-2xl bg-blue-600 px-4 font-black text-white">인증메일 받기</button>
              </div>
            </div>

            {verification.isAuthRequested && !verification.isVerified && (
              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">이메일 인증번호</label>
                <div className="flex gap-3">
                  <input value={verification.authCode} onChange={(event) => verification.setAuthCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" className={`${AUTH_INPUT_CLASS} min-w-0 flex-1`} />
                  <button type="button" onClick={verification.verify} className="rounded-2xl bg-slate-900 px-6 font-black text-white">확인</button>
                </div>
              </div>
            )}
            {verification.isVerified && <p className="rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-700">✓ 이메일 인증이 완료되었습니다.</p>}
          </div>

          {(error || verification.error) && <p className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">{error || verification.error}</p>}
          <button type="submit" className="mt-8 h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700">회원가입 완료</button>
          <Link to="/" className="mt-4 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700">메인으로 돌아가기</Link>
        </form>
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
