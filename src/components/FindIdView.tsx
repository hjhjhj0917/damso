import { useState } from 'react';
import { type SavedUser, type Carrier, type AuthMethod, CarrierSelect, PhoneInput, AuthMethodSelector } from './Header';
import { ModalTitle } from './ModalTitle';

function normalizePhone(value: string) {
  return value.trim().replaceAll('-', '')
}

function isValidPhone(value: string) {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(value))
}

export function FindIdView({
  getSavedUsers,
  onBack,
}: {
  getSavedUsers: () => SavedUser[]
  onBack: () => void
}) {
  const [phone, setPhone] = useState('')
  const [carrier, setCarrier] = useState<Carrier>('SKT')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('문자인증')
  const [authCode, setAuthCode] = useState('')
  const [isAuthRequested, setIsAuthRequested] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [foundId, setFoundId] = useState('')

  const [phoneError, setPhoneError] = useState('')
  const [carrierError, setCarrierError] = useState('')
  const [authCodeError, setAuthCodeError] = useState('')
  const [commonError, setCommonError] = useState('')

  const resetErrors = () => {
    setPhoneError('')
    setCarrierError('')
    setAuthCodeError('')
    setCommonError('')
  }

  const handleRequestAuth = () => {
    resetErrors()
    setFoundId('')

    if (!isValidPhone(phone)) {
      setPhoneError('전화번호 형식이 올바르지 않습니다.')
      return
    }

    if (authMethod === 'pass') {
      setIsVerified(true)
      alert('PASS 인증이 완료되었습니다. 시연용 처리입니다.')
      return
    }

    setIsAuthRequested(true)
    alert('인증문자가 발송되었습니다. 시연용 인증번호는 123456입니다.')
  }

  const handleVerifySms = () => {
    setAuthCodeError('')

    if (authCode !== '123456') {
      setAuthCodeError('인증번호가 맞지 않습니다.')
      return
    }

    setIsVerified(true)
  }

  const handleFindId = () => {
    resetErrors()
    setFoundId('')

    const users = getSavedUsers()
    const normalizedPhone = normalizePhone(phone)

    const usersWithSamePhone = users.filter(
      (user) => user.phone === normalizedPhone,
    )

    if (!isValidPhone(phone)) {
      setPhoneError('전화번호 형식이 올바르지 않습니다.')
      return
    }

    if (usersWithSamePhone.length === 0) {
      setPhoneError('저장된 회원 정보와 일치하는 전화번호가 없습니다.')
      return
    }

    const matchedUser = usersWithSamePhone.find(
      (user) => user.carrier === carrier,
    )

    if (!matchedUser) {
      setCarrierError('저장된 회원 정보와 일치하는 통신사가 아닙니다.')
      return
    }

    if (!isVerified) {
      setCommonError('본인인증을 먼저 완료해 주세요.')
      return
    }

    setFoundId(matchedUser.id)
  }

  return (
    <>
      <ModalTitle
        title="아이디 찾기"
        description="전화번호와 통신사 인증으로 가입한 아이디를 찾을 수 있습니다."
      />

      <div className="space-y-5">
        <div>
          <CarrierSelect carrier={carrier} setCarrier={setCarrier} />

          {carrierError && (
            <p className="mt-3 text-lg font-bold text-red-600">
              {carrierError}
            </p>
          )}
        </div>

        <div>
          <PhoneInput
            phone={phone}
            setPhone={(value) => {
              setPhone(value)
              setPhoneError('')
              setFoundId('')
            }}
          />

          {phoneError && (
            <p className="mt-3 text-lg font-bold text-red-600">{phoneError}</p>
          )}
        </div>

        <AuthMethodSelector
          authMethod={authMethod}
          setAuthMethod={(value) => {
            setAuthMethod(value)
            setIsAuthRequested(false)
            setIsVerified(false)
            setAuthCode('')
            setFoundId('')
            resetErrors()
          }}
        />

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
                onClick={handleVerifySms}
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

        {isVerified && (
          <p className="rounded-2xl bg-blue-50 px-5 py-4 text-lg font-bold text-blue-700">
            본인인증이 완료되었습니다.
          </p>
        )}

        {commonError && (
          <p className="rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">
            {commonError}
          </p>
        )}

        <button
          type="button"
          onClick={handleFindId}
          className="h-16 w-full rounded-2xl bg-slate-900 text-xl font-black text-white hover:bg-slate-800"
        >
          아이디 확인하기
        </button>

        {foundId && (
          <div className="rounded-3xl bg-blue-50 p-6 text-center">
            <p className="text-lg font-bold text-slate-600">
              가입된 아이디입니다.
            </p>
            <p className="mt-3 text-3xl font-black text-blue-700">{foundId}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onBack}
          className="h-14 w-full rounded-2xl bg-slate-100 text-lg font-black text-slate-700 hover:bg-slate-200"
        >
          로그인 화면으로 돌아가기
        </button>
      </div>
    </>
  )
}