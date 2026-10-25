import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToHash from './components/ScrollToHash'
import TrendSignals from './pages/TrendSignals'
import StockDetail from './pages/StockDetail'
import AccountOpeningGuide from './pages/AccountOpeningGuide'

function App() {
  return (
    <div className="flex min-h-svh flex-col bg-paper text-ink">
      <ScrollToHash />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<TrendSignals />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/huong-dan-mo-tai-khoan" element={<AccountOpeningGuide />} />
          <Route path="*" element={<TrendSignals />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
