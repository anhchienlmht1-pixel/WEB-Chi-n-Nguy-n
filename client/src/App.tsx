import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import PbCompare from './pages/PbCompare'

function App() {
  return (
    <div className="min-h-svh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock/:symbol" element={<StockDetail />} />
        <Route path="/so-sanh-pb" element={<PbCompare />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </div>
  )
}

export default App
