import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-6 px-5 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl">🔍</span>
      <div>
        <h1 className="text-3xl font-black text-slate-900">페이지를 찾을 수 없어요</h1>
        <p className="mt-3 text-lg font-bold text-slate-500">
          주소가 바뀌었거나 잘못된 경로로 들어오신 것 같아요.
        </p>
      </div>
      <Link
        to="/"
        className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
      >
        메인으로 돌아가기
      </Link>
    </main>
  )
}

export default NotFound
