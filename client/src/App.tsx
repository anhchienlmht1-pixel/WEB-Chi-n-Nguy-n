import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToHash from './components/ScrollToHash'
import PageTransition from './components/PageTransition'
import TrendSignals from './pages/TrendSignals'
import StockDetail from './pages/StockDetail'
import AccountOpeningGuide from './pages/AccountOpeningGuide'
import About from './pages/About'
import BankSector from './pages/BankSector'
import SecuritiesSector from './pages/SecuritiesSector'
import RealEstateSector from './pages/RealEstateSector'
import SectorWavesPage from './pages/SectorWaves'
import MarketOverview from './pages/MarketOverview'

function App() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-svh flex-col bg-paper text-ink">
      <ScrollToHash />
      <PageTransition />
      <Header />
      <main key={pathname} className="page-enter flex-1">
        <Routes>
          <Route path="/" element={<About />} />
          <Route path="/tin-hieu" element={<TrendSignals />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/huong-dan-mo-tai-khoan" element={<AccountOpeningGuide />} />
          <Route path="/nganh-ngan-hang" element={<BankSector />} />
          <Route path="/nganh-chung-khoan" element={<SecuritiesSector />} />
          <Route path="/nganh-bat-dong-san" element={<RealEstateSector />} />
          <Route path="/song-nganh" element={<SectorWavesPage />} />
          <Route path="/toan-canh-thi-truong" element={<MarketOverview />} />
          <Route path="/gioi-thieu" element={<About />} />
          <Route path="*" element={<About />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
