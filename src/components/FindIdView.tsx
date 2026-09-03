import { useState } from 'react'
import { AUTH_INPUT_CLASS, useEmailVerification } from './authShared'
import { ModalTitle } from './ModalTitle'
import { findIdSendCode, findIdVerify } from '../utils/api'

export function FindIdView({ onBack }: { onBack: () => void }) {
  const [foundId, setFoundId] = useState('')

  const verification = useEmailVerification({
    onSend: findIdSendCode,
    onVerify: findIdVerify,
  })

  const requestAuth = () => {
    setFoundId('')
    void verification.requestAuth()
  }

  // 인증번호가 맞으면 서버가 아이디를 함께 돌려줍니다. 코드 확인과 아이디 조회가
  // 한 번의 왕복으로 끝나므로 별도의 "아이디 확인하기" 단계가 필요 없습니다.
  const verify = async () => {
    const result = await verification.verify()
    const data = result?.data as { id?: string } | undefined
    if (data?.id) setFoundId(data.id)
  }

  return <>
    <ModalTitle title="아이디 찾기" description="가입한 이메일을 인증하면 아이디를 확인할 수 있습니다." />
    <div className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-lg font-extrabold text-slate-800">이메일</span>
        <input value={verification.email} onChange={(event) => { verification.setEmail(event.target.value); setFoundId('') }} type="email" placeholder="example@email.com" className={AUTH_INPUT_CLASS} />
      </label>
      <button type="button" onClick={requestAuth} disabled={verification.isPending} className="h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white disabled:bg-slate-300">
        {verification.isPending ? '처리 중…' : '인증메일 받기'}
      </button>
      {verification.isAuthRequested && !verification.isVerified && (
        <div>
          <label className="mb-2 block text-lg font-extrabold text-slate-800">이메일 인증번호</label>
          <div className="flex gap-3">
            <input value={verification.authCode} onChange={(event) => verification.setAuthCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" className={`${AUTH_INPUT_CLASS} min-w-0 flex-1`} />
            <button type="button" onClick={verify} disabled={verification.isPending} className="rounded-2xl bg-slate-900 px-6 text-lg font-black text-white disabled:bg-slate-300">확인</button>
          </div>
        </div>
      )}
      {verification.error && <p className="rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">{verification.error}</p>}
      {foundId && <div className="rounded-3xl bg-blue-50 p-6 text-center"><p className="text-lg font-bold text-slate-600">가입된 아이디입니다.</p><p className="mt-3 text-3xl font-black text-blue-700">{foundId}</p></div>}
      <button type="button" onClick={onBack} className="h-14 w-full rounded-2xl bg-slate-100 text-lg font-black text-slate-700">로그인 화면으로 돌아가기</button>
    </div>
  </>
}
