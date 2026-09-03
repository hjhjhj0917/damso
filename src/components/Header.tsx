import { type FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FindIdView } from "./FindIdView";
import { FindPasswordView } from "./FindPasswordView";
import { AUTH_INPUT_CLASS, normalizeId } from "./authShared";
import { errorMessage, login as loginRequest, type ApiUser } from "../utils/api";
import { useSession } from "../session/sessionContext";
import { LOGIN_PARAM, REDIRECT_PARAM, postLoginTarget } from "../utils/authRedirect";

type LoginModalMode = "login" | "findId" | "findPassword";

const PILL_PRIMARY =
  "flex h-12 items-center rounded-full bg-blue-600 px-6 text-base font-bold text-white shadow-md hover:bg-blue-700";
const PILL_OUTLINE =
  "hidden h-12 items-center rounded-full border border-blue-600 px-6 text-base font-bold text-blue-700 hover:bg-blue-50 sm:flex";

function Header() {
  const [manualLoginOpen, setManualLoginOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { status, user, autoLogin, signIn, signOut } = useSession();

  // 모달 표시 여부를 효과로 맞추지 않고 계산합니다. 예전에는 ?login=true를 보고 열기만 했지
  // 쿼리가 사라져도 닫지 않아, 주소가 바뀌어도 모달이 남아 있었습니다.
  const isLoginOpen = manualLoginOpen || searchParams.get(LOGIN_PARAM) === "true";

  /**
   * 자동 로그인 이동.
   *
   * 예전에는 브라우저 저장값 두 개만 보고 옮겼습니다. 그래서 쿠키가 만료된 사람도 저장값이
   * 남아 있으면 /dashboard로 갔다가 거기서 다시 홈으로 튕겨 나왔습니다. 이제 서버가 확인해 준
   * status만 봅니다.
   */
  useEffect(() => {
    if (status !== "authenticated" || !autoLogin) return;
    if (location.pathname !== "/") return;
    if (searchParams.get(LOGIN_PARAM) === "true") return;

    navigate("/dashboard", { replace: true });
  }, [status, autoLogin, location.pathname, searchParams, navigate]);

  // 모달을 닫을 때는 쿼리만 걷어냅니다. 예전에는 홈으로 이동시켰기 때문에, 고객센터에서 모달을
  // 닫으면 보던 화면을 잃고 홈으로 쫓겨났습니다.
  const closeLogin = () => {
    setManualLoginOpen(false);
    if (!searchParams.has(LOGIN_PARAM) && !searchParams.has(REDIRECT_PARAM)) return;

    setSearchParams(
      (params) => {
        params.delete(LOGIN_PARAM);
        params.delete(REDIRECT_PARAM);
        return params;
      },
      { replace: true },
    );
  };

  // 로그인 성공은 closeLogin을 거치지 않습니다. 쿼리를 걷어내는 이동과 목적지로 가는 이동이
  // 겹쳐 두 번 움직이게 됩니다. 목적지 주소에는 이미 auth 쿼리가 없습니다.
  const handleSignedIn = (apiUser: ApiUser, remember: boolean) => {
    signIn(apiUser, { autoLogin: remember });
    setManualLoginOpen(false);
    navigate(postLoginTarget(location.pathname, location.search), {
      replace: true,
    });
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

          {/*
            세 상태 모두 같은 자리를 차지합니다 — 좁은 화면용 한 칸(hidden sm:*)과 늘 보이는
            한 칸. 서버 답이 오면서 칸 수가 달라지면 헤더가 한 번 덜컥거립니다.
          */}
          <div className="flex items-center gap-3">
            {status === "loading" && (
              <>
                <div className="hidden h-12 w-24 animate-pulse rounded-full bg-slate-200 sm:block" />
                <div className="h-12 w-28 animate-pulse rounded-full bg-slate-200" />
              </>
            )}

            {status === "anonymous" && (
              <>
                <button
                  type="button"
                  onClick={() => setManualLoginOpen(true)}
                  className={PILL_OUTLINE}
                >
                  로그인
                </button>

                <Link to="/signup" className={PILL_PRIMARY}>
                  회원가입
                </Link>
              </>
            )}

            {status === "authenticated" && (
              <>
                <span className="hidden text-base font-bold text-slate-700 sm:block">
                  {user?.name} 님
                </span>

                <Link to="/dashboard" className={PILL_PRIMARY}>
                  대시보드
                </Link>

                <button
                  type="button"
                  onClick={() => void signOut()}
                  className={PILL_OUTLINE}
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {isLoginOpen && (
        <LoginModal onClose={closeLogin} onSuccess={handleSignedIn} />
      )}
    </>
  );
}

function LoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (user: ApiUser, autoLogin: boolean) => void;
}) {
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

    // 저장도 이동도 여기서 하지 않습니다. 브라우저 사본은 SessionProvider 한 곳만 씁니다 —
    // 로그인 화면이 따로 적어 두면 어느 쪽이 최신인지 아무도 모르게 됩니다.
    onSuccess(result.data, autoLogin);
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
