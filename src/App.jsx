import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameStateProvider } from './context/GameStateContext.jsx'
import HomePage           from './pages/HomePage.jsx'
import ScenarioSelectPage  from './pages/ScenarioSelectPage.jsx'
import ScenarioIntroPage   from './pages/ScenarioIntroPage.jsx'
import DialogueScreen      from './pages/DialogueScreen.jsx'
import EndingScreen        from './pages/EndingScreen.jsx'
import ResultsScreen       from './pages/ResultsScreen.jsx'
import GrowthReportPage    from './pages/GrowthReportPage.jsx'

export default function App() {
  return (
    <GameStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                       element={<HomePage />} />
          <Route path="/select"                 element={<ScenarioSelectPage />} />
          <Route path="/intro/:scenarioId"      element={<ScenarioIntroPage />} />
          <Route path="/dialogue/:scenarioId"   element={<DialogueScreen />} />
          <Route path="/ending"                 element={<EndingScreen />} />
          <Route path="/results"                element={<ResultsScreen />} />
          <Route path="/growth"                 element={<GrowthReportPage />} />
        </Routes>
      </BrowserRouter>
    </GameStateProvider>
  )
}
