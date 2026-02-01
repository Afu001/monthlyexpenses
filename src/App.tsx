import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { useAppState } from './lib/state'
import { Dashboard } from './pages/Dashboard'
import { Expenses } from './pages/Expenses'
import { Receipts } from './pages/Receipts'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { isLoggedIn } from './lib/auth'

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
      <Route path="/login" element={<Login />} />
      <Route
        element={
          isLoggedIn() ? <Shell monthKey={selectedMonthKey} onMonthChange={setSelectedMonthKey} /> : <Navigate to="/login" replace />
        }
      >
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
