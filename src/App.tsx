import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { useAppState } from './lib/state'
import { Dashboard } from './pages/Dashboard'
import { Expenses } from './pages/Expenses'
import { Receipts } from './pages/Receipts'
import { Settings } from './pages/Settings'

function App() {
  const {
    selectedMonthKey,
    setSelectedMonthKey,
    monthExpenses,
    addExpense,
    removeExpense,
    upsertMonthlyQuick,
  } = useAppState()

  return (
    <Routes>
      <Route element={<Shell monthKey={selectedMonthKey} onMonthChange={setSelectedMonthKey} />}>
        <Route index element={<Dashboard monthKey={selectedMonthKey} expenses={monthExpenses} />} />
        <Route
          path="/expenses"
          element={
            <Expenses
              monthKey={selectedMonthKey}
              expenses={monthExpenses}
              onAdd={addExpense}
              onRemove={removeExpense}
              onQuickSet={upsertMonthlyQuick}
            />
          }
        />
        <Route path="/receipts" element={<Receipts monthKey={selectedMonthKey} onImport={addExpense} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
