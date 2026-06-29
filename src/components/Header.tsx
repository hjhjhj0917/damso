import { Link } from 'react-router-dom'

function Header() {
  return (
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
          <Link
            to="/login"
            className="hidden rounded-full border border-blue-600 px-6 py-3 text-base font-bold text-blue-700 hover:bg-blue-50 sm:block"
          >
            로그인
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700"
          >
            회원가입
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header