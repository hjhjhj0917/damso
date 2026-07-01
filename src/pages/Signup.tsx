import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type CheckStatus = 'idle' | 'available' | 'duplicate' | 'invalid'

type UserIdType = 'email' | 'phone'

type Carrier = 'SKT' | 'KT' | 'LG U+' | '알뜰폰'

type SavedUser = {
  id: string
  idType: UserIdType
  password: string
  phone: string
  carrier: Carrier
}

function Signup() {
  const navigate = useNavigate()

  const [userId, setUserId] = useState('')
  const [phone, setPhone] = useState('')
  const [carrier, setCarrier] = useState<Carrier>('SKT')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [submitError, setSubmitError] = useState('')

  const normalizedUserId = normalizeUserId(userId)
  const normalizedPhone = normalizePhone(phone)
  const userIdType = getUserIdType(userId)

  const isUserIdValid = userIdType !== null
  const isPhoneValid = /^01[016789]\d{7,8}$/.test(normalizedPhone)
  const isPasswordValid = password.length >= 8
  const isPasswordSame = password === passwordConfirm && passwordConfirm.length > 0

  const getSavedUsers = (): SavedUser[] => {
    const savedUsers = localStorage.getItem('ansimUsers')
    return savedUsers ? (JSON.parse(savedUsers) as SavedUser[]) : []
  }

  const handleDuplicateCheck = () => {
    setSubmitError('')

    if (!isUserIdValid) {
      setCheckStatus('invalid')
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

    if (!isUserIdValid || userIdType === null) {
      setSubmitError('아이디는 이메일 또는 전화번호 형식으로 입력해 주세요.')
      return
    }

    if (checkStatus !== 'available') {
      setSubmitError('아이디 중복확인을 먼저 해주세요.')
      return
    }

    if (!isPhoneValid) {
      setSubmitError('본인확인용 전화번호를 올바르게 입력해 주세요.')
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
      phone: normalizedPhone,
      carrier,
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
              더 편안한 돌봄을
              <br />
              <span className="text-blue-600">지금 시작하세요</span>
            </h1>

            <p className="mt-7 text-2xl leading-10 text-slate-700">
              이메일 또는 전화번호로 가입하고, 본인확인 정보를 통해 아이디와
              비밀번호를 찾을 수 있습니다.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-5">
              <InfoCard icon="🎙️" title="음성 기록" />
              <InfoCard icon="🤖" title="AI 대화" />
              <InfoCard icon="📘" title="데일리 노트" />
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
              아이디와 본인확인 정보를 입력해 주세요.
            </p>
          </div>

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
                  이메일 예시: example@email.com / 전화번호 예시: 01012345678
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
                  본인확인용 전화번호
                </label>

                <input
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setSubmitError('')
                  }}
                  type="tel"
                  placeholder="01012345678"
                  className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                />

                <p className="mt-3 text-base font-bold text-slate-500">
                  아이디/비밀번호 찾기에 사용됩니다.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-lg font-extrabold text-slate-800">
                  통신사
                </label>

                <select
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value as Carrier)}
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
          </form>

          <div className="mt-7 text-center">
            <p className="text-lg font-bold text-slate-600">
              이미 계정이 있으신가요?
            </p>

            <Link
              to="/"
              className="mt-3 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-700 hover:bg-blue-100"
            >
              메인으로 돌아가 로그인하기
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function getUserIdType(value: string): UserIdType | null {
  const trimmedValue = value.trim()
  const onlyNumber = trimmedValue.replaceAll('-', '')

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)
  const isPhone = /^01[016789]\d{7,8}$/.test(onlyNumber)

  if (isEmail) return 'email'
  if (isPhone) return 'phone'

  return null
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