import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserIdType, type AccountType, type AuthMethod, type Carrier, type SavedUser } from '../components/authShared'

type CheckStatus = 'idle' | 'available' | 'duplicate' | 'invalid'


function Signup() {
  const navigate = useNavigate()

  const [accountType, setAccountType] = useState<AccountType>('user')
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

  const [parentName, setParentName] = useState('')
  const [parentResidentFront, setParentResidentFront] = useState('')
  const [parentResidentBackFirst, setParentResidentBackFirst] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentRelation, setParentRelation] = useState('자녀')
  const [parentAddress, setParentAddress] = useState('')
  const [parentConsent, setParentConsent] = useState(false)
  const [parentVerified, setParentVerified] = useState(false)
  const [linkParentLater, setLinkParentLater] = useState(false)

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

  const handleVerifyParent = () => {
    setSubmitError('')
    const normalizedParentPhone = normalizePhone(parentPhone)
    const normalizedParentFront = parentResidentFront.replace(/\D/g, '')
    const normalizedParentBackFirst = parentResidentBackFirst.replace(/\D/g, '')

    if (
      parentName.trim().length < 2 ||
      !/^\d{6}$/.test(normalizedParentFront) ||
      !/^[1-4]$/.test(normalizedParentBackFirst) ||
      !/^01[016789]\d{7,8}$/.test(normalizedParentPhone)
    ) {
      setSubmitError('피보호인의 성함, 주민등록번호와 전화번호를 정확히 입력해 주세요.')
      return
    }

    const isDemoParent =
      parentName.trim() === '김순자' &&
      normalizedParentFront === '480312' &&
      normalizedParentBackFirst === '2' &&
      normalizedParentPhone === '01012345678'
    const matchedParent = getSavedUsers().some((user) =>
      (user.accountType ?? 'user') === 'user' &&
      user.name === parentName.trim() &&
      user.residentFront === normalizedParentFront &&
      user.residentBackFirst === normalizedParentBackFirst &&
      user.phone === normalizedParentPhone,
    )

    if (!isDemoParent && !matchedParent) {
      setParentVerified(false)
      setSubmitError('입력한 정보와 일치하는 사용자 계정을 찾을 수 없습니다.')
      return
    }

    setParentVerified(true)
    setSubmitError('')
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

    if (accountType === 'guardian' && !linkParentLater) {
      const normalizedParentPhone = normalizePhone(parentPhone)
      const normalizedParentFront = parentResidentFront.replace(/\D/g, '')
      const normalizedParentBackFirst = parentResidentBackFirst.replace(/\D/g, '')

      if (parentName.trim().length < 2) {
        setSubmitError('피보호인의 이름을 정확히 입력해 주세요.')
        return
      }

      if (!/^\d{6}$/.test(normalizedParentFront) || !/^[1-4]$/.test(normalizedParentBackFirst)) {
        setSubmitError('피보호인의 주민등록번호를 정확히 입력해 주세요.')
        return
      }

      if (!/^01[016789]\d{7,8}$/.test(normalizedParentPhone)) {
        setSubmitError('피보호인의 전화번호를 정확히 입력해 주세요.')
        return
      }

      if (!parentAddress.trim()) {
        setSubmitError('피보호인의 거주 지역을 입력해 주세요.')
        return
      }

      if (!parentConsent) {
        setSubmitError('피보호인 개인정보 등록 및 서비스 연결 동의가 필요합니다.')
        return
      }

      if (!parentVerified) {
        setSubmitError('피보호인 계정 인증을 먼저 완료해 주세요.')
        return
      }
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
      accountType,
      parent: accountType === 'guardian' && !linkParentLater ? {
        name: parentName.trim(),
        residentFront: parentResidentFront.replace(/\D/g, ''),
        residentBackFirst: parentResidentBackFirst.replace(/\D/g, ''),
        phone: normalizePhone(parentPhone),
        relation: parentRelation,
        address: parentAddress.trim(),
        consentAt: new Date().toISOString(),
      } : undefined,
    }

    localStorage.setItem('ansimUsers', JSON.stringify([...savedUsers, newUser]))

    alert(`${accountType === 'guardian' ? '보호자' : '사용자'} 계정 회원가입이 완료되었습니다. 로그인 후 이용해 주세요.`)
    navigate('/')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 px-5 py-12">
      <section className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_520px]">
        <div className="hidden lg:block">
          <div className="rounded-[3rem] bg-white/80 p-10 shadow-xl">
            <div className="inline-flex rounded-full bg-blue-100 px-5 py-3 text-lg font-black text-blue-700">
              담소 회원가입
            </div>

            <h1 className="mt-8 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              어르신의 평안한 하루를
              <br />
              지키는 첫걸음,
              <br />
              <span className="text-blue-600">도담이 함께합니다.</span>
            </h1>

            <p className="mt-7 text-xl leading-9 text-slate-700">
              따뜻한 대화부터 하루 기록과 건강 관리까지,
              도담이 곁에서 차분히 도와드려요.
            </p>

            <p className="mt-9 text-lg font-black text-blue-700">
              도담이의 서비스
            </p>
            <div className="mt-10 grid grid-cols-2 gap-5">
              <InfoCard icon="🌼" title="음성·문자 대화" />
              <InfoCard icon="📘" title="데일리노트" />
              <InfoCard icon="📖" title="나의 자서전" />
              <InfoCard icon="💙" title="건강 리포트" />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-8 text-center">
            <img src="/logo.svg" alt="담소" className="mx-auto h-16 w-16 rounded-3xl shadow-lg" />

            <h2 className="mt-5 text-4xl font-black text-slate-950">
              회원가입
            </h2>

            <p className="mt-3 text-lg leading-8 text-slate-600">
              {accountType === 'guardian'
                ? '보호자 본인인증 후 피보호인을 연결해 주세요.'
                : '먼저 본인인증을 완료해 주세요.'}
            </p>
          </div>

          {!isVerified && (
            <div className="mb-7">
              <p className="mb-3 text-lg font-extrabold text-slate-800">
                가입할 계정 유형
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('user')
                    setSubmitError('')
                  }}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    accountType === 'user'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span className="text-2xl">👵🏻</span>
                  <b className="mt-2 block text-lg">사용자 계정</b>
                  <span className="mt-1 block text-xs leading-5">
                    서비스를 직접 이용해요
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('guardian')
                    setSubmitError('')
                  }}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    accountType === 'guardian'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span className="text-2xl">👨‍👩‍👧</span>
                  <b className="mt-2 block text-lg">보호자 계정</b>
                  <span className="mt-1 block text-xs leading-5">
                    피보호인을 연결해 돌봐요
                  </span>
                </button>
              </div>
            </div>
          )}

          {!isVerified ? (
            <div className="space-y-6">
              <div className="rounded-3xl bg-blue-50 p-5">
                <p className="text-lg font-black text-blue-700">
                  1단계 · {accountType === 'guardian' ? '보호자 ' : ''}본인인증
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

                {accountType === 'guardian' && (
                  <section className="rounded-3xl border-2 border-blue-100 bg-blue-50/70 p-5">
                    <div className="mb-5">
                      <p className="text-lg font-black text-blue-700">
                        2단계 · 피보호인 정보 연결
                      </p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                        피보호인의 사용자 계정 정보와 대조하여 안전하게 연결합니다.
                      </p>
                    </div>

                    <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-blue-200 bg-white p-4 text-sm font-black text-blue-700">
                      <input
                        type="checkbox"
                        checked={linkParentLater}
                        onChange={(event) => {
                          setLinkParentLater(event.target.checked)
                          setParentVerified(false)
                          setSubmitError('')
                        }}
                        className="h-5 w-5 accent-blue-600"
                      />
                      나중에 등록하기
                      <span className="ml-auto text-xs font-bold text-slate-400">
                        마이페이지에서 연결 가능
                      </span>
                    </label>

                    {linkParentLater ? (
                      <div className="rounded-2xl bg-white p-5 text-center">
                        <p className="text-3xl">🔗</p>
                        <p className="mt-3 font-black text-slate-700">피보호인 연결을 건너뜁니다</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">가입 후 마이페이지의 ‘피보호인 계정 연동하기’에서 등록할 수 있어요.</p>
                      </div>
                    ) : <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-base font-extrabold text-slate-800">
                          피보호인 성함
                        </label>
                        <input
                          value={parentName}
                          onChange={(event) => {
                            setParentName(event.target.value)
                            setParentVerified(false)
                            setSubmitError('')
                          }}
                          placeholder="성함을 입력하세요"
                          className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-base font-extrabold text-slate-800">
                          피보호인 주민등록번호
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            value={parentResidentFront}
                            onChange={(event) => {
                              setParentResidentFront(event.target.value.replace(/\D/g, '').slice(0, 6))
                              setParentVerified(false)
                              setSubmitError('')
                            }}
                            inputMode="numeric"
                            placeholder="앞 6자리"
                            className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold outline-none focus:border-blue-500"
                          />
                          <span className="font-black text-slate-400">-</span>
                          <div className="flex h-14 min-w-0 flex-1 items-center rounded-2xl border-2 border-slate-200 bg-white px-4">
                            <input
                              value={parentResidentBackFirst}
                              onChange={(event) => {
                                setParentResidentBackFirst(event.target.value.replace(/\D/g, '').slice(0, 1))
                                setParentVerified(false)
                                setSubmitError('')
                              }}
                              inputMode="numeric"
                              placeholder="1"
                              className="w-7 bg-transparent text-lg font-semibold outline-none"
                            />
                            <span className="ml-1 font-black tracking-[0.13em] text-slate-400">******</span>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-400">계정 확인을 위해 뒷자리 첫 번째 숫자까지만 입력합니다.</p>
                      </div>

                      <div>
                        <label className="mb-2 block text-base font-extrabold text-slate-800">
                          피보호인 전화번호
                        </label>
                        <input
                          value={parentPhone}
                          onChange={(event) => {
                            setParentPhone(event.target.value.replace(/\D/g, '').slice(0, 11))
                            setParentVerified(false)
                            setSubmitError('')
                          }}
                          type="tel"
                          inputMode="numeric"
                          placeholder="01012345678"
                          className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyParent}
                        disabled={parentVerified}
                        className={`h-14 w-full rounded-2xl text-base font-black ${parentVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}
                      >
                        {parentVerified ? '✓ 피보호인 계정 인증 완료' : '피보호인 계정 확인하기'}
                      </button>

                      <div>
                        <label className="mb-2 block text-base font-extrabold text-slate-800">
                          보호자와의 관계
                        </label>
                        <select
                          value={parentRelation}
                          onChange={(event) => setParentRelation(event.target.value)}
                          className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-blue-500"
                        >
                          <option value="자녀">자녀</option>
                          <option value="며느리·사위">며느리·사위</option>
                          <option value="손자녀">손자녀</option>
                          <option value="기타 가족">기타 가족</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-base font-extrabold text-slate-800">
                          피보호인 거주 지역
                        </label>
                        <input
                          value={parentAddress}
                          onChange={(event) => {
                            setParentAddress(event.target.value)
                            setSubmitError('')
                          }}
                          placeholder="예: 서울특별시 종로구"
                          className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold outline-none focus:border-blue-500"
                        />
                      </div>

                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-600">
                        <input
                          type="checkbox"
                          checked={parentConsent}
                          onChange={(event) => {
                            setParentConsent(event.target.checked)
                            setSubmitError('')
                          }}
                          className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                        />
                        피보호인에게 서비스 연결과 개인정보 등록 동의를 받았으며,
                        건강·생활 알림을 제공받는 것에 동의합니다. (필수)
                      </label>
                    </div>}
                  </section>
                )}

                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-lg font-black text-slate-700">
                    {accountType === 'guardian' ? '3단계' : '2단계'} · 계정 정보 설정
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    로그인에 사용할 아이디와 비밀번호를 만들어 주세요.
                  </p>
                </div>

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
