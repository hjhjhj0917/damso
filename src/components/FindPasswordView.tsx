import { useState } from 'react';
import { type SavedUser, type Carrier, type AuthMethod, isValidPhone, normalizeId, normalizePhone, CarrierSelect, PhoneInput, AuthMethodSelector } from './Header';
import { ModalTitle } from './ModalTitle';

export function FindPasswordView({
  getSavedUsers, onBack,
}: {
  getSavedUsers: () => SavedUser[];
  onBack: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState<Carrier>('SKT');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('문자인증');
  const [authCode, setAuthCode] = useState('');
  const [isAuthRequested, setIsAuthRequested] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [foundPassword, setFoundPassword] = useState('');
  const [error, setError] = useState('');

  const handleRequestAuth = () => {
    setError('');
    setFoundPassword('');

    if (!userId.trim()) {
      setError('아이디를 먼저 입력해 주세요.');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('전화번호를 올바르게 입력해 주세요.');
      return;
    }

    if (authMethod === 'pass') {
      setIsVerified(true);
      alert('PASS 인증이 완료되었습니다. 시연용 처리입니다.');
      return;
    }

    setIsAuthRequested(true);
    alert('인증문자가 발송되었습니다. 시연용 인증번호는 123456입니다.');
  };

  const handleVerifySms = () => {
    if (authCode !== '123456') {
      setError('인증번호가 맞지 않습니다.');
      return;
    }

    setError('');
    setIsVerified(true);
  };

  const handleFindPassword = () => {
    setError('');
    setFoundPassword('');

    if (!isVerified) {
      setError('본인인증을 먼저 완료해 주세요.');
      return;
    }

    const users = getSavedUsers();
    const normalizedUserId = normalizeId(userId);
    const normalizedPhone = normalizePhone(phone);

    const matchedUser = users.find(
      (user) => normalizeId(user.id) === normalizedUserId &&
        user.phone === normalizedPhone &&
        user.carrier === carrier
    );

    if (!matchedUser) {
      setError('입력한 정보와 일치하는 계정이 없습니다.');
      return;
    }

    setFoundPassword(matchedUser.password);
  };

  return (
    <>
      <ModalTitle
        title="비밀번호 찾기"
        description="아이디와 본인인증 정보를 입력하면 비밀번호를 확인할 수 있습니다." />

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-lg font-extrabold text-slate-800">
            아이디
          </label>

          <input
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              setError('');
              setFoundPassword('');
            }}
            type="text"
            placeholder="이메일 또는 전화번호를 입력하세요"
            className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white" />
        </div>

        <CarrierSelect carrier={carrier} setCarrier={setCarrier} />

        <PhoneInput phone={phone} setPhone={setPhone} />

        <AuthMethodSelector
          authMethod={authMethod}
          setAuthMethod={(value) => {
            setAuthMethod(value);
            setIsAuthRequested(false);
            setIsVerified(false);
            setAuthCode('');
            setError('');
            setFoundPassword('');
          }} />

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
                onChange={(event) => setAuthCode(event.target.value)}
                type="text"
                placeholder="123456"
                className="h-16 flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white" />

              <button
                type="button"
                onClick={handleVerifySms}
                className="h-16 rounded-2xl bg-slate-900 px-5 text-lg font-black text-white"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {isVerified && (
          <p className="rounded-2xl bg-blue-50 px-5 py-4 text-lg font-bold text-blue-700">
            본인인증이 완료되었습니다.
          </p>
        )}

        {error && (
          <p className="rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleFindPassword}
          className="h-16 w-full rounded-2xl bg-slate-900 text-xl font-black text-white hover:bg-slate-800"
        >
          비밀번호 확인하기
        </button>

        {foundPassword && (
          <div className="rounded-3xl bg-blue-50 p-6 text-center">
            <p className="text-lg font-bold text-slate-600">
              등록된 비밀번호입니다.
            </p>
            <p className="mt-3 text-3xl font-black text-blue-700">
              {foundPassword}
            </p>
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
  );
}
