import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="text-4xl font-bold text-blue-600">
          Tailwind CSS 연결 성공!
        </h1>
        <p className="mt-4 text-gray-600">
          React + Vite + Tailwind 세팅 완료
        </p>
      </div>
    </div>
  )
}

export default App