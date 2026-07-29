import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameStateProvider } from './context/GameStateContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import HomePage           from './pages/HomePage.jsx'

import ScenarioIntroPage   from './pages/ScenarioIntroPage.jsx'
import DialogueScreen      from './pages/DialogueScreen.jsx'
import EndingScreen        from './pages/EndingScreen.jsx'
import ResultsScreen       from './pages/ResultsScreen.jsx'
import GrowthReportPage    from './pages/GrowthReportPage.jsx'
import AlienMainPage        from './pages/AlienMainPage.jsx'

export default function App() {
  return (
    <LanguageProvider>
    <GameStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                       element={<HomePage />} />
          <Route path="/play"                   element={<AlienMainPage />} />
          <Route path="/intro/:scenarioId"      element={<ScenarioIntroPage />} />
          <Route path="/dialogue/:scenarioId"   element={<DialogueScreen />} />
          <Route path="/ending"                 element={<EndingScreen />} />
          <Route path="/results"                element={<ResultsScreen />} />
          <Route path="/growth"                 element={<GrowthReportPage />} />
        </Routes>
      </BrowserRouter>
    </GameStateProvider>
    </LanguageProvider>
  )
}
