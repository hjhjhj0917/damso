import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import Support from './pages/Support'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="/support" element={<Support />} />
      </Routes>
    </div>
  )
}

export default App
