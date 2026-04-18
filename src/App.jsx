import MarioHitBlock from './MarioHitBlock'
import Auth from './components/Auth'
import { useAuth } from './hooks/useAuth'
import './App.css'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #5C94FC, #87CEEB)',
        fontFamily: '"Press Start 2P", cursive',
        fontSize: '1.5rem',
        color: 'white'
      }}>
        Loading...
      </div>
    )
  }

  return user ? <MarioHitBlock /> : <Auth />
}

export default App
