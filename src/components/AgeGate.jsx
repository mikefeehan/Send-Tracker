import { useState } from 'react'

// Blocks the app until the user confirms they are 21+
// Stores confirmation in localStorage (persists across sessions)

const KEY = 'st_age_verified'

export function isAgeVerified() {
  return localStorage.getItem(KEY) === '1'
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i) // current year down to 100 years ago

export default function AgeGate({ onVerified }) {
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [err, setErr] = useState('')

  function handleConfirm() {
    setErr('')
    if (!month || !year) {
      setErr('Please select your birth month and year.')
      return
    }
    const birthYear = parseInt(year, 10)
    const birthMonth = parseInt(month, 10) // 1-12

    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1 // 1-12

    let age = currentYear - birthYear
    // If they haven't had their birthday month yet this year, subtract 1
    if (currentMonth < birthMonth) {
      age--
    }

    if (age < 21) {
      setErr("You must be 21 or older to use Send Tracker.")
      return
    }
    localStorage.setItem(KEY, '1')
    localStorage.setItem('st_age_month', String(birthMonth))
    localStorage.setItem('st_age_year', String(birthYear))
    onVerified()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #050914 0%, #0a1224 40%, #0f1a2e 70%, #050914 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">☘️</div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome</h1>
          <p className="text-slate-400 text-sm mt-1.5">Send Tracker is for adults 21+</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(10,18,34,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            Please confirm when you were born. You must be <span className="font-bold text-blue-400">21 or older</span> to access this app.
          </p>

          <label className="block text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Birth Month & Year</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Year</option>
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {err && <p className="text-red-400 text-xs text-center mb-3">{err}</p>}

          <button onClick={handleConfirm} className="btn-cta w-full py-3 font-bold text-white">
            Confirm
          </button>

          <p className="text-[10px] text-slate-500 text-center mt-4 leading-relaxed">
            By continuing, you confirm the information above is accurate.
            Send Tracker promotes responsible, moderate consumption.
            If you or someone you know needs help, visit{' '}
            <a href="https://www.samhsa.gov/find-help/national-helpline" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">SAMHSA's National Helpline</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
