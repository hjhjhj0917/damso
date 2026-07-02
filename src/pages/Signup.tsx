import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserIdType, type AuthMethod, type Carrier, type SavedUser } from '../components/authShared'

type CheckStatus = 'idle' | 'available' | 'duplicate' | 'invalid'


function Signup() {
  const navigate = useNavigate()

  const [isVerified, setIsVerified] = useState(false)

  const [authPhone, setAuthPhone] = useState('')
  const [authCarrier, setAuthCarrier] = useState<Carrier>('SKT')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('문자인증')
  const [authCode, setAuthCode] = useState('')
  const [isAuthRequested, setIsAuthRequested] = useState(false)

  const [authPhoneError, setAuthPhoneError] = useState('')
  const [authCodeError, setAuthCodeError] = useState('')
  const [authError, setAuthError] = useState('')

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [submitError, setSubmitError] = useState('')

  const [authName, setAuthName] = useState('')
  const [residentFront, setResidentFront] = useState('')
  const [residentBackFirst, setResidentBackFirst] = useState('')

  const [authNameError, setAuthNameError] = useState('')
  const [residentNumberError, setResidentNumberError] = useState('')

  const normalizedResidentFront = residentFront.replace(/\D/g, '')
  const normalizedResidentBackFirst = residentBackFirst.replace(/\D/g, '')

  const isNameValid = authName.trim().length >= 2
  const isResidentNumberValid =
    /^\d{6}$/.test(normalizedResidentFront) &&
    /^[1-4]$/.test(normalizedResidentBackFirst)

  const normalizedUserId = normalizeUserId(userId)
  const normalizedAuthPhone = normalizePhone(authPhone)
  const userIdType = getUserIdType(userId)

  const isUserIdValid = userIdType !== null
  const isPhoneValid = /^01[016789]\d{7,8}$/.test(normalizedAuthPhone)
  const isPasswordValid = password.length >= 8
  const isPasswordSame = password === passwordConfirm && passwordConfirm.length > 0

  const getSavedUsers = (): SavedUser[] => {
    const savedUsers = localStorage.getItem('ansimUsers')
    return savedUsers ? (JSON.parse(savedUsers) as SavedUser[]) : []
  }

  const handleRequestAuth = () => {
  setAuthPhoneError('')
  setAuthCodeError('')
  setAuthNameError('')
  setResidentNumberError('')

  let hasError = false

  if (!isNameValid) {
    setAuthNameError('이름을 정확히 입력해 주세요.')
    hasError = true
  }

  if (!isResidentNumberValid) {
    setResidentNumberError(
      '주민등록번호 앞 6자리와 뒷자리 첫 번째 숫자를 입력해 주세요.',
    )
    hasError = true
  }

  if (!isPhoneValid) {
    setAuthPhoneError('전화번호 형식이 올바르지 않습니다.')
    hasError = true
  }

  if (hasError) {
    return
  }

  if (authMethod === 'pass') {
    setIsVerified(true)
    alert('PASS 인증이 완료되었습니다.')
    return
  }

  setIsAuthRequested(true)
  alert('인증문자가 발송되었습니다.')
}

  const handleVerifyCode = () => {
    setAuthCodeError('')

    if (authCode !== '123456') {
      setAuthCodeError('인증번호가 맞지 않습니다.')
      return
    }

    setIsVerified(true)
  }

  const handleDuplicateCheck = () => {
    setSubmitError('')

    if (!isVerified) {
      setSubmitError('본인인증을 먼저 완료해 주세요.')
      return
    }

    if (!isUserIdValid) {
      setCheckStatus('invalid')
      return
    }

    if (userIdType === 'phone' && normalizedUserId !== normalizedAuthPhone) {
      setSubmitError('전화번호 아이디는 본인인증한 전화번호와 같아야 합니다.')
      return
    }

    const savedUsers = getSavedUsers()

    const isDuplicate = savedUsers.some(
      (user) => normalizeUserId(user.id) === normalizedUserId,
    )

    if (isDuplicate || normalizedUserId === 'test@test.com') {
      setCheckStatus('duplicate')
      return
    }

    setCheckStatus('available')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isVerified) {
      setSubmitError('본인인증을 먼저 완료해 주세요.')
      return
    }

    if (!isUserIdValid || userIdType === null) {
      setSubmitError('아이디는 이메일 또는 전화번호 형식으로 입력해 주세요.')
      return
    }

    if (userIdType === 'phone' && normalizedUserId !== normalizedAuthPhone) {
      setSubmitError('전화번호 아이디는 본인인증한 전화번호와 같아야 합니다.')
      return
    }

    if (checkStatus !== 'available') {
      setSubmitError('아이디 중복확인을 먼저 해주세요.')
      return
    }

    if (!isPasswordValid) {
      setSubmitError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    if (!isPasswordSame) {
      setSubmitError('비밀번호가 서로 일치하지 않습니다.')
      return
    }

    const savedUsers = getSavedUsers()

      const newUser: SavedUser = {
    id: normalizedUserId,
    idType: userIdType,
    password,
    phone: normalizedAuthPhone,
    carrier: authCarrier,
    name: authName.trim(),
    residentFront: normalizedResidentFront,
    residentBackFirst: normalizedResidentBackFirst,
  }

    localStorage.setItem('ansimUsers', JSON.stringify([...savedUsers, newUser]))

    alert('회원가입이 완료되었습니다. 로그인 후 이용해 주세요.')
    navigate('/')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 px-5 py-12">
      <section className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_520px]">
        <div className="hidden lg:block">
          <div className="rounded-[3rem] bg-white/80 p-10 shadow-xl">
            <div className="inline-flex rounded-full bg-blue-100 px-5 py-3 text-lg font-black text-blue-700">
              안심지키미 회원가입
            </div>

            <h1 className="mt-8 text-6xl font-black leading-tight text-slate-950">
              본인인증 후
              <br />
              <span className="text-blue-600">가입을 시작하세요</span>
            </h1>

            <p className="mt-7 text-2xl leading-10 text-slate-700">
              전화번호와 통신사 인증을 먼저 완료한 뒤, 아이디와 비밀번호를
              설정할 수 있습니다.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-5">
              <InfoCard icon="🔐" title="본인인증" />
              <InfoCard icon="🎙️" title="음성 기록" />
              <InfoCard icon="🤖" title="AI 대화" />
              <InfoCard icon="💙" title="건강 리포트" />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-3xl text-white shadow-lg">
              ♡
            </div>

            <h2 className="mt-5 text-4xl font-black text-slate-950">
              회원가입
            </h2>

            <p className="mt-3 text-lg leading-8 text-slate-600">
              먼저 본인인증을 완료해 주세요.
            </p>
          </div>

          {!isVerified ? (
            <div className="space-y-6">
              <div className="rounded-3xl bg-blue-50 p-5">
                <p className="text-lg font-black text-blue-700">
                  1단계 · 본인인증
                </p>
                <p className="mt-2 text-base font-bold text-slate-600">
                  인증이 완료되어야 회원가입 정보를 입력할 수 있습니다.
                </p>
              </div>

              <div>
  <label className="mb-2 block text-lg font-extrabold text-slate-800">
    이름
  </label>

  <input
    value={authName}
    onChange={(event) => {
      setAuthName(event.target.value)
      setAuthNameError('')
    }}
    type="text"
    placeholder="이름을 입력하세요"
    className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
  />

  {authNameError && (
    <p className="mt-3 text-lg font-bold text-red-600">
      {authNameError}
    </p>
  )}
</div>

<div>
  <label className="mb-2 block text-lg font-extrabold text-slate-800">
    주민등록번호
  </label>

  <div className="flex items-center gap-3">
    <input
      value={residentFront}
      onChange={(event) => {
        const onlyNumber = event.target.value.replace(/\D/g, '').slice(0, 6)
        setResidentFront(onlyNumber)
        setResidentNumberError('')
      }}
      type="text"
      inputMode="numeric"
      placeholder="앞 6자리"
      className="h-16 min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
    />

    <span className="text-2xl font-black text-slate-500">-</span>

    <div className="flex h-16 min-w-0 flex-1 items-center rounded-2xl border-2 border-slate-200 bg-slate-50 px-4">
      <input
        value={residentBackFirst}
        onChange={(event) => {
          const onlyNumber = event.target.value.replace(/\D/g, '').slice(0, 1)
          setResidentBackFirst(onlyNumber)
          setResidentNumberError('')
        }}
        type="text"
        inputMode="numeric"
        placeholder="1"
        className="w-8 bg-transparent text-xl font-semibold outline-none placeholder:text-slate-400"
      />

      <span className="ml-2 text-xl font-black tracking-[0.15em] text-slate-500">
        ******
      </span>
    </div>
  </div>

  <p className="mt-3 text-base font-bold text-slate-500">
    뒷자리 7자리 중 첫 번째 숫자만 입력합니다.
  </p>

  {residentNumberError && (
    <p className="mt-3 text-lg font-bold text-red-600">
      {residentNumberError}
    </p>
  )}
</div>

              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">
                  통신사
                </label>

                <select
                  value={authCarrier}
                  onChange={(event) =>
                    setAuthCarrier(event.target.value as Carrier)
                  }
                  className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="SKT">SKT</option>
                  <option value="KT">KT</option>
                  <option value="LG U+">LG U+</option>
                  <option value="알뜰폰">알뜰폰</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">
                  전화번호
                </label>

                <input
                  value={authPhone}
                  onChange={(event) => {
                    setAuthPhone(event.target.value)
                    setAuthPhoneError('')
                    setAuthError('')
                  }}
                  type="tel"
                  placeholder="01012345678"
                  className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                />

                {authPhoneError && (
                  <p className="mt-3 text-lg font-bold text-red-600">
                    {authPhoneError}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-lg font-extrabold text-slate-800">
                  인증 방식
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('문자인증')
                      setIsAuthRequested(false)
                      setAuthCode('')
                      setAuthCodeError('')
                    }}
                    className={`h-14 rounded-2xl text-lg font-black ${
                      authMethod === '문자인증'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    문자 인증
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('pass')
                      setIsAuthRequested(false)
                      setAuthCode('')
                      setAuthCodeError('')
                    }}
                    className={`h-14 rounded-2xl text-lg font-black ${
                      authMethod === 'pass'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    PASS 인증
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRequestAuth}
                className="h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700"
              >
                {authMethod === '문자인증' ? '인증문자 받기' : 'PASS 인증하기'}
              </button>

              {authMethod === '문자인증' && isAuthRequested && (
                <div>
                  <label className="mb-2 block text-lg font-extrabold text-slate-800">
                    인증번호
                  </label>

                  <div className="flex gap-3">
                    <input
                      value={authCode}
                      onChange={(event) => {
                        setAuthCode(event.target.value)
                        setAuthCodeError('')
                      }}
                      type="text"
                      placeholder="123456"
                      className="h-16 flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="h-16 rounded-2xl bg-slate-900 px-5 text-lg font-black text-white"
                    >
                      확인
                    </button>
                  </div>

                  {authCodeError && (
                    <p className="mt-3 text-lg font-bold text-red-600">
                      {authCodeError}
                    </p>
                  )}
                </div>
              )}

              {authError && (
                <p className="rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">
                  {authError}
                </p>
              )}

              <Link
                to="/"
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700 hover:bg-slate-200"
              >
                메인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">

                <div>
                  <label className="mb-2 block text-lg font-extrabold text-slate-800">
                    아이디
                  </label>

                  <div className="relative">
                    <input
                      value={userId}
                      onChange={(event) => {
                        setUserId(event.target.value)
                        setCheckStatus('idle')
                        setSubmitError('')
                      }}
                      type="text"
                      placeholder="이메일 또는 전화번호를 입력하세요"
                      className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 pr-32 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={handleDuplicateCheck}
                      className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-blue-600 px-5 text-base font-black text-white hover:bg-blue-700"
                    >
                      중복확인
                    </button>
                  </div>

                  <p className="mt-3 text-base font-bold text-slate-500">
                    이메일 예시: example@email.com / 전화번호 아이디는 인증한
                    번호와 같아야 합니다.
                  </p>

                  {checkStatus === 'invalid' && (
                    <p className="mt-3 text-lg font-bold text-red-600">
                      이메일 또는 전화번호 형식으로 입력해 주세요.
                    </p>
                  )}

                  {checkStatus === 'duplicate' && (
                    <p className="mt-3 text-lg font-bold text-red-600">
                      이미 사용 중인 아이디입니다.
                    </p>
                  )}

                  {checkStatus === 'available' && (
                    <p className="mt-3 text-lg font-bold text-blue-600">
                      사용 가능한 아이디입니다.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-lg font-extrabold text-slate-800">
                    비밀번호 설정
                  </label>

                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setSubmitError('')
                    }}
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                  />

                  <p
                    className={`mt-3 text-lg font-bold ${
                      password.length === 0
                        ? 'text-slate-500'
                        : isPasswordValid
                          ? 'text-blue-600'
                          : 'text-red-600'
                    }`}
                  >
                    비밀번호는 8자 이상이어야 한다.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-extrabold text-slate-800">
                    비밀번호 설정 확인
                  </label>

                  <input
                    value={passwordConfirm}
                    onChange={(event) => {
                      setPasswordConfirm(event.target.value)
                      setSubmitError('')
                    }}
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                  />

                  {passwordConfirm.length > 0 && !isPasswordSame && (
                    <p className="mt-3 text-lg font-bold text-red-600">
                      비밀번호가 서로 일치하지 않습니다.
                    </p>
                  )}

                  {isPasswordSame && (
                    <p className="mt-3 text-lg font-bold text-blue-600">
                      비밀번호가 일치합니다.
                    </p>
                  )}
                </div>
              </div>

              {submitError && (
                <p className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="mt-8 h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700"
              >
                회원가입 완료
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVerified(false)
                  setUserId('')
                  setPassword('')
                  setPasswordConfirm('')
                  setCheckStatus('idle')
                  setSubmitError('')
                  setAuthCode('')
                  setIsAuthRequested(false)
                  setAuthNameError('')
                  setResidentNumberError('')
                  setAuthPhoneError('')
                  setAuthCodeError('')
                }}
                className="mt-4 h-14 w-full rounded-2xl bg-slate-100 text-lg font-black text-slate-700 hover:bg-slate-200"
              >
                본인인증 다시하기
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

function normalizeUserId(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.includes('@')) {
    return trimmedValue.toLowerCase()
  }

  return trimmedValue.replaceAll('-', '')
}

function normalizePhone(value: string) {
  return value.trim().replaceAll('-', '')
}

function InfoCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-3xl bg-blue-50 p-6 shadow-sm">
      <div className="text-4xl">{icon}</div>
      <p className="mt-4 text-xl font-black text-slate-900">{title}</p>
    </div>
  )
}

export default Signup