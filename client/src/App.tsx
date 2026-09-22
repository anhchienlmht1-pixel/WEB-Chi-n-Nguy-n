import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import Watchlist from './pages/Watchlist'
import PbCompare from './pages/PbCompare'
import DailyDigest from './pages/DailyDigest'
import StockStrength from './pages/StockStrength'
import AccountOpeningGuide from './pages/AccountOpeningGuide'

function App() {
  return (
    <div className="flex min-h-svh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/thi-truong" element={<Dashboard />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/theo-doi" element={<Watchlist />} />
          <Route path="/so-sanh-pb" element={<PbCompare />} />
          <Route path="/ban-tin" element={<DailyDigest />} />
          <Route path="/suc-manh-co-phieu" element={<StockStrength />} />
          <Route path="/huong-dan-mo-tai-khoan" element={<AccountOpeningGuide />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
