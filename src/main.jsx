import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err, info) {
    console.error('App crashed:', err, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#06111a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f0f4f8', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍻</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#7a8fa6', marginBottom: '20px' }}>Pull down to refresh or tap below to try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
