import { useState } from "react";
import {
  AUTH_INPUT_CLASS,
  getSavedUsers,
  normalizeId,
  saveSavedUsers,
  useEmailVerification,
} from "./authShared";
import { ModalTitle } from "./ModalTitle";

export function FindPasswordView({ onBack }: { onBack: () => void }) {
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isReset, setIsReset] = useState(false);

  const matchedUser = (email: string) =>
    getSavedUsers().find(
      (user) =>
        normalizeId(user.id) === normalizeId(userId) &&
        user.email?.toLowerCase() === email.toLowerCase(),
    );

  const verification = useEmailVerification({
    onBeforeSend: (email) => {
      if (!userId.trim()) return "아이디를 입력해 주세요.";
      return matchedUser(email) ? null : "입력한 정보와 일치하는 계정이 없습니다.";
    },
  });

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    verification.resetVerification();
    setIsReset(false);
  };

  const resetPassword = () => {
    if (!verification.isVerified) {
      verification.setError("이메일 인증을 먼저 완료해 주세요.");
      return;
    }
    if (newPassword.length < 8) {
      verification.setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== passwordConfirm) {
      verification.setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    const user = matchedUser(verification.email);
    if (!user) {
      verification.setError("입력한 정보와 일치하는 계정이 없습니다.");
      return;
    }
    saveSavedUsers(
      getSavedUsers().map((savedUser) =>
        normalizeId(savedUser.id) === normalizeId(user.id)
          ? { ...savedUser, password: newPassword }
          : savedUser,
      ),
    );
    verification.setError("");
    setIsReset(true);
    setNewPassword("");
    setPasswordConfirm("");
  };

  return (
    <>
      <ModalTitle
        title="비밀번호 재설정"
        description="아이디와 가입 이메일을 인증하면 비밀번호를 재설정 할 수 있습니다."
      />
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-lg font-extrabold text-slate-800">
            아이디
          </span>
          <input
            value={userId}
            onChange={(event) => handleUserIdChange(event.target.value)}
            placeholder="아이디를 입력하세요"
            className={AUTH_INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-lg font-extrabold text-slate-800">
            이메일
          </span>
          <input
            value={verification.email}
            onChange={(event) => {
              verification.setEmail(event.target.value);
              setIsReset(false);
            }}
            type="email"
            placeholder="example@email.com"
            className={AUTH_INPUT_CLASS}
          />
        </label>
        <button
          type="button"
          onClick={verification.requestAuth}
          className="h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white"
        >
          인증메일 받기
        </button>
        {verification.isAuthRequested && !verification.isVerified && (
          <div>
            <label className="mb-2 block text-lg font-extrabold text-slate-800">
              이메일 인증번호
            </label>
            <div className="flex gap-3">
              <input
                value={verification.authCode}
                onChange={(event) =>
                  verification.setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                placeholder="123456"
                className={`${AUTH_INPUT_CLASS} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={verification.verify}
                className="rounded-2xl bg-slate-900 px-6 text-lg font-black text-white"
              >
                확인
              </button>
            </div>
          </div>
        )}
        {verification.isVerified && !isReset && (
          <>
            <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-lg font-bold text-emerald-700">
              ✓ 이메일 인증이 완료되었습니다.
            </p>
            <label className="block">
              <span className="mb-2 block text-lg font-extrabold text-slate-800">
                새 비밀번호
              </span>
              <input
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  verification.setError("");
                }}
                type="password"
                placeholder="8자 이상 입력하세요"
                className={AUTH_INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-lg font-extrabold text-slate-800">
                새 비밀번호 확인
              </span>
              <input
                value={passwordConfirm}
                onChange={(event) => {
                  setPasswordConfirm(event.target.value);
                  verification.setError("");
                }}
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                className={AUTH_INPUT_CLASS}
              />
            </label>
            <button
              type="button"
              onClick={resetPassword}
              className="h-16 w-full rounded-2xl bg-slate-900 text-xl font-black text-white"
            >
              비밀번호 재설정하기
            </button>
          </>
        )}
        {isReset && (
          <div className="rounded-3xl bg-blue-50 p-6 text-center">
            <p className="text-xl font-black text-blue-700">
              비밀번호가 재설정되었습니다.
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              새 비밀번호로 로그인해 주세요.
            </p>
          </div>
        )}
        {verification.error && (
          <p className="rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600">
            {verification.error}
          </p>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-14 w-full rounded-2xl bg-slate-100 text-lg font-black text-slate-700"
        >
          로그인 화면으로 돌아가기
        </button>
      </div>
    </>
  );
}
