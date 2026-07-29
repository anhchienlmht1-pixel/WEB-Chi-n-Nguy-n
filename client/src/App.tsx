import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import Watchlist from './pages/Watchlist'
import PerformanceCompare from './pages/PerformanceCompare'
import CompanyFundamentalsCompare from './pages/CompanyFundamentalsCompare'
import InvestmentOutlook from './pages/InvestmentOutlook'
import MaFilter from './pages/MaFilter'

function App() {
  return (
    <div className="min-h-svh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock/:symbol" element={<StockDetail />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/so-sanh" element={<PerformanceCompare />} />
        <Route path="/co-ban-doanh-nghiep" element={<CompanyFundamentalsCompare />} />
        <Route path="/loc-ma" element={<MaFilter />} />
        <Route path="/trien-vong-dau-tu" element={<InvestmentOutlook />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </div>
  )
}

export default App
