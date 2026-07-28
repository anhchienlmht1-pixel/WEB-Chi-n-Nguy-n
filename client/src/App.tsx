import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import Watchlist from './pages/Watchlist'
import PerformanceCompare from './pages/PerformanceCompare'
import BankCompare from './pages/BankCompare'
import SecuritiesCompare from './pages/SecuritiesCompare'
import RealEstateCompare from './pages/RealEstateCompare'
import Backtest from './pages/Backtest'
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
        <Route path="/so-sanh-ngan-hang" element={<BankCompare />} />
        <Route path="/so-sanh-chung-khoan" element={<SecuritiesCompare />} />
        <Route path="/so-sanh-bat-dong-san" element={<RealEstateCompare />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/loc-ma" element={<MaFilter />} />
        <Route path="/trien-vong-dau-tu" element={<InvestmentOutlook />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </div>
  )
}

export default App
