import { type FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FindIdView } from "./FindIdView";
import { FindPasswordView } from "./FindPasswordView";
import { AUTH_INPUT_CLASS, normalizeId, toAccountType } from "./authShared";
import { errorMessage, login as loginRequest } from "../utils/api";

type LoginModalMode = "login" | "findId" | "findPassword";

function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldOpenLogin = searchParams.get("login");
    // URL의 ?login=true 쿼리와 모달 표시 상태를 동기화합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (shouldOpenLogin === "true") setIsLoginOpen(true);

    const hasAutoLogin = localStorage.getItem("ansimAutoLogin") === "true";
    const hasSession = localStorage.getItem("ansimSession") !== null;
    if (
      hasAutoLogin &&
      hasSession &&
      location.pathname === "/" &&
      shouldOpenLogin !== "true"
    ) {
      navigate("/dashboard", { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const closeLogin = () => {
    setIsLoginOpen(false);
    navigate("/", { replace: true });
  };

  if (location.pathname.startsWith("/dashboard")) return null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="담소"
              className="h-11 w-11 rounded-2xl shadow-md"
            />
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              담소
            </span>
          </Link>

          <nav className="hidden items-center gap-10 text-[17px] font-semibold text-slate-700 md:flex">
            <a href="/#service" className="hover:text-blue-600">
              서비스 소개
            </a>
            <a href="/#ai" className="hover:text-blue-600">
              도담의 원칙
            </a>
            <a href="/#care" className="hover:text-blue-600">
              돌봄 과정
            </a>
            <a href="/#guide" className="hover:text-blue-600">
              사용 가이드
            </a>
            <Link to="/support" className="hover:text-blue-600">
              고객센터
            </Link>
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

      {isLoginOpen && <LoginModal onClose={closeLogin} />}
    </>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState<LoginModalMode>("login");

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [autoLogin, setAutoLogin] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setIsPending(true);

    const result = await loginRequest(normalizeId(userId), password);

    setIsPending(false);

    if (result.status !== "success" || !result.data) {
      setLoginError(errorMessage(result));
      return;
    }

    const user = result.data;
    // 화면을 즉시 그리기 위한 사본입니다. 연결 정보는 담지 않습니다 — 그건 이제
    // USER_LINK 표에 있고 Dashboard가 /api/link/list로 받습니다. 권한을 정하는 값을
    // 브라우저 저장소에 두면 저장값을 고치는 것만으로 권한이 생깁니다.
    localStorage.setItem(
      "ansimSession",
      JSON.stringify({
        id: user.id,
        name: user.name,
        phone: user.phone ?? "",
        accountType: toAccountType(user.roles),
      }),
    );

    if (autoLogin) {
      localStorage.setItem("ansimAutoLogin", "true");
    } else {
      localStorage.removeItem("ansimAutoLogin");
    }

    onClose();
    navigate("/dashboard");
  };

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-5 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-[560px] rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600 hover:bg-slate-200"
        >
          ×
        </button>

        {mode === "login" && (
          <LoginView
            userId={userId}
            password={password}
            autoLogin={autoLogin}
            loginError={loginError}
            isPending={isPending}
            setUserId={setUserId}
            setPassword={setPassword}
            setAutoLogin={setAutoLogin}
            handleLogin={handleLogin}
            onFindId={() => {
              setLoginError("");
              setMode("findId");
            }}
            onFindPassword={() => {
              setLoginError("");
              setMode("findPassword");
            }}
            onClose={onClose}
          />
        )}

        {mode === "findId" && <FindIdView onBack={() => setMode("login")} />}

        {mode === "findPassword" && (
          <FindPasswordView onBack={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}

function LoginView({
  userId,
  password,
  autoLogin,
  loginError,
  isPending,
  setUserId,
  setPassword,
  setAutoLogin,
  handleLogin,
  onFindId,
  onFindPassword,
  onClose,
}: {
  userId: string;
  password: string;
  autoLogin: boolean;
  loginError: string;
  isPending: boolean;
  setUserId: (value: string) => void;
  setPassword: (value: string) => void;
  setAutoLogin: (value: boolean) => void;
  handleLogin: (event: FormEvent<HTMLFormElement>) => void;
  onFindId: () => void;
  onFindPassword: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="mb-8 text-center">
        <img
          src="/logo.svg"
          alt="담소"
          className="mx-auto h-16 w-16 rounded-3xl shadow-lg"
        />

        <h2 className="mt-5 text-4xl font-black text-slate-950">로그인</h2>

        <p className="mt-3 text-lg leading-8 text-slate-600">
          담소 서비스를 이용하려면
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
              placeholder="아이디를 입력하세요"
              className={AUTH_INPUT_CLASS}
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
              className={AUTH_INPUT_CLASS}
            />

            {loginError && (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-lg font-bold text-red-600">
                {loginError}
              </p>
            )}
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 text-base font-bold text-slate-600">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(event) => setAutoLogin(event.target.checked)}
            className="h-5 w-5 accent-blue-600"
          />
          자동 로그인
          <span className="ml-auto text-sm font-medium text-slate-400">
            다음 방문부터 바로 시작
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-7 h-16 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300"
        >
          {isPending ? "로그인 중…" : "로그인하기"}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-3 text-base font-bold text-slate-500">
        <button
          type="button"
          onClick={onFindId}
          className="hover:text-blue-600"
        >
          아이디 찾기
        </button>
        <span>|</span>
        <button
          type="button"
          onClick={onFindPassword}
          className="hover:text-blue-600"
        >
          비밀번호 재설정
        </button>
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
  );
}

export default Header;
