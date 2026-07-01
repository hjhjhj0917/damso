import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FindIdView } from './FindIdView'
import { FindPasswordView } from './FindPasswordView'

type LoginModalMode = 'login' | 'findId' | 'findPassword'

export type Carrier = 'SKT' | 'KT' | 'LG U+' | '알뜰폰'

export type AuthMethod = '문자인증' | 'pass'

export type SavedUser = {
  id: string
  idType: 'email' | 'phone'
  password: string
  phone: string
  carrier: Carrier
}

function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-md">
              ♡
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              안심지키미
            </span>
          </Link>

          <nav className="hidden items-center gap-10 text-[17px] font-semibold text-slate-700 md:flex">
            <a href="#service" className="hover:text-blue-600">
              서비스 소개
            </a>
            <a href="#ai" className="hover:text-blue-600">
              AI 서비스
            </a>
            <a href="#care" className="hover:text-blue-600">
              안심 기능
            </a>
            <a href="#guide" className="hover:text-blue-600">
              사용 가이드
            </a>
            <a href="#contact" className="hover:text-blue-600">
              고객센터
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="hidden rounded-full border border-blue-600 px-6 py-3 text-base font-bold text-blue-700 hover:bg-blue-50 sm:block"
            >
              로그인
            </button>

            <Link
              to="/signup"
              className="rounded-full bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700"
            >
              회원가입
            </Link>
          </div>
        </div>
      </header>

      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
    </>
  )
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()

  const [mode, setMode] = useState<LoginModalMode>('login')

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(false)

  const getSavedUsers = (): SavedUser[] => {
    const savedUsers = localStorage.getItem('ansimUsers')
    return savedUsers ? (JSON.parse(savedUsers) as SavedUser[]) : []
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const users = getSavedUsers()

    const normalizedInputId = normalizeId(userId)

    const isDemoUser = userId === 'demo' && password === '1234'

    const isSignupUser = users.some((user) => {
      return normalizeId(user.id) === normalizedInputId && user.password === password
    })

    if (isDemoUser || isSignupUser) {
      setLoginError(false)
      onClose()
      navigate('/dashboard')
      return
    }

    setLoginError(true)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-5 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-[560px] rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600 hover:bg-slate-200"
        >
          ×
        </button>

        {mode === 'login' && (
          <LoginView
            userId={userId}
            password={password}
            loginError={loginError}
            setUserId={setUserId}
            setPassword={setPassword}
            handleLogin={handleLogin}
            onFindId={() => {
              setLoginError(false)
              setMode('findId')
            }}
            onFindPassword={() => {
              setLoginError(false)
              setMode('findPassword')
            }}
            onClose={onClose}
          />
        )}

        {mode === 'findId' && (
          <FindIdView
            getSavedUsers={getSavedUsers}
            onBack={() => setMode('login')}
          />
        )}

        {mode === 'findPassword' && (
          <FindPasswordView
            getSavedUsers={getSavedUsers}
            onBack={() => setMode('login')}
          />
        )}
      </div>
    </div>
  )
}

function LoginView({
  userId,
  password,
  loginError,
  setUserId,
  setPassword,
  handleLogin,
  onFindId,
  onFindPassword,
  onClose,
}: {
  userId: string
  password: string
  loginError: boolean
  setUserId: (value: string) => void
  setPassword: (value: string) => void
  handleLogin: (event: FormEvent<HTMLFormElement>) => void
  onFindId: () => void
  onFindPassword: () => void
  onClose: () => void
}) {
  const handleSocialLogin = (serviceName: string) => {
    alert(`${serviceName} 연동 로그인은 시연용 버튼입니다.`)
  }

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-3xl text-white shadow-lg">
          ♡
        </div>

        <h2 className="mt-5 text-4xl font-black text-slate-950">로그인</h2>

        <p className="mt-3 text-lg leading-8 text-slate-600">
          안심지키미 서비스를 이용하려면
          <br />
          로그인이 필요합니다.
        </p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-lg font-extrabold text-slate-800">
              아이디
            </label>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              type="text"
              placeholder="이메일 또는 전화번호를 입력하세요"
              className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-lg font-extrabold text-slate-800">
              비밀번호
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="비밀번호를 입력하세요"
              className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
            />

            {loginError && (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-lg font-bold text-red-600">
                아이디 및 비밀번호가 맞지 않습니다.
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="mt-7 h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700"
        >
          로그인하기
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-3 text-base font-bold text-slate-500">
        <button type="button" onClick={onFindId} className="hover:text-blue-600">
          아이디 찾기
        </button>
        <span>|</span>
        <button
          type="button"
          onClick={onFindPassword}
          className="hover:text-blue-600"
        >
          비밀번호 찾기
        </button>
      </div>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-base font-bold text-slate-400">간편 로그인</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SocialButton
          label="구글"
          icon="G"
          className="border-slate-200 bg-white text-slate-800"
          onClick={() => handleSocialLogin('구글')}
        />
        <SocialButton
          label="카카오톡"
          icon="💬"
          className="border-yellow-300 bg-yellow-300 text-slate-900"
          onClick={() => handleSocialLogin('카카오톡')}
        />
        <SocialButton
          label="네이버"
          icon="N"
          className="border-green-500 bg-green-500 text-white"
          onClick={() => handleSocialLogin('네이버')}
        />
        <SocialButton
          label="페이스북"
          icon="f"
          className="border-blue-700 bg-blue-700 text-white"
          onClick={() => handleSocialLogin('페이스북')}
        />
      </div>

      <div className="mt-8 rounded-3xl bg-blue-50 p-5 text-center">
        <p className="text-lg font-bold text-slate-700">
          아직 회원이 아니신가요?
        </p>

        <Link
          to="/signup"
          onClick={onClose}
          className="mt-4 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-white text-xl font-black text-blue-700 shadow-sm hover:bg-blue-100"
        >
          회원가입 하러가기
        </Link>
      </div>
    </>
  )
}

export function CarrierSelect({
  carrier,
  setCarrier,
}: {
  carrier: Carrier
  setCarrier: (value: Carrier) => void
}) {
  return (
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
  )
}

export function PhoneInput({
  phone,
  setPhone,
}: {
  phone: string
  setPhone: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-lg font-extrabold text-slate-800">
        전화번호
      </label>

      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        type="tel"
        placeholder="01012345678"
        className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
      />
    </div>
  )
}

export function AuthMethodSelector({
  authMethod,
  setAuthMethod,
}: {
  authMethod: AuthMethod
  setAuthMethod: (value: AuthMethod) => void
}) {
  return (
    <div>
      <label className="mb-3 block text-lg font-extrabold text-slate-800">
        인증 방식
      </label>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setAuthMethod('문자인증')}
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
          onClick={() => setAuthMethod('pass')}
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
  )
}

function SocialButton({
  label,
  icon,
  className,
  onClick,
}: {
  label: string
  icon: string
  className: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 items-center justify-center gap-3 rounded-2xl border-2 text-lg font-black shadow-sm transition hover:scale-[1.02] ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-lg font-black text-slate-900">
        {icon}
      </span>
      {label}
    </button>
  )
}

export function normalizeId(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.includes('@')) {
    return trimmedValue.toLowerCase()
  }

  return trimmedValue.replaceAll('-', '')
}

export function normalizePhone(value: string) {
  return value.trim().replaceAll('-', '')
}

export function isValidPhone(value: string) {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(value))
}

export default Header