import { useState } from 'react'
import { AUTH_INPUT_CLASS, getSavedUsers, useEmailVerification } from './authShared'
import { ModalTitle } from './ModalTitle'

export function FindIdView({ onBack }: { onBack: () => void }) {
  const [foundId, setFoundId] = useState('')

  const verification = useEmailVerification({
    onBeforeSend: (email) =>
      getSavedUsers().some((user) => user.email?.toLowerCase() === email.toLowerCase())
        ? null
        : '가입된 이메일을 찾을 수 없습니다.',
  })

  const requestAuth = () => {
    setFoundId('')
    verification.requestAuth()
  }

  const findId = () => {
    if (!verification.isVerified) { verification.setError('이메일 인증을 먼저 완료해 주세요.'); return }
    const matched = getSavedUsers().find((user) => user.email?.toLowerCase() === verification.email.trim().toLowerCase())
    if (!matched) { verification.setError('가입된 이메일을 찾을 수 없습니다.'); return }
    verification.setError('')
    setFoundId(matched.id)
  }

  return <>
    <ModalTitle title="아이디 찾기" description="가입한 이메일을 인증하면 아이디를 확인할 수 있습니다." />
    <div className="space-y-5">
      <label className="block"><span className="mb-2 block text-lg font-extrabold text-slate-800">이메일</span><input value={verification.email} onChange={(event) => { verification.setEmail(event.target.value); setFoundId('') }} type="email" placeholder="example@email.com" className={AUTH_INPUT_CLASS} /></label>
      <button type="button" onClick={requestAuth} className="h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white">인증메일 받기</button>
      {verification.isAuthRequested && !verification.isVerified && <div><label className="mb-2 block text-lg font-extrabold text-slate-800">이메일 인증번호</label><div className="flex gap-3"><input value={verification.authCode} onChange={(event) => verification.setAuthCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" className={`${AUTH_INPUT_CLASS} min-w-0 flex-1`} /><button type="button" onClick={verification.verify} className="rounded-2xl bg-slate-900 px-6 text-lg font-black text-white">확인</button></div></div>}
      {verification.isVerified && <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-lg font-bold text-emerald-700">✓ 이메일 인증이 완료되었습니다.</p>}
      {verification.error && <p className="rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">{verification.error}</p>}
      <button type="button" onClick={findId} className="h-16 w-full rounded-2xl bg-slate-900 text-xl font-black text-white">아이디 확인하기</button>
      {foundId && <div className="rounded-3xl bg-blue-50 p-6 text-center"><p className="text-lg font-bold text-slate-600">가입된 아이디입니다.</p><p className="mt-3 text-3xl font-black text-blue-700">{foundId}</p></div>}
      <button type="button" onClick={onBack} className="h-14 w-full rounded-2xl bg-slate-100 text-lg font-black text-slate-700">로그인 화면으로 돌아가기</button>
    </div>
  </>
}
