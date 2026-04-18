import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useHabits } from './hooks/useHabits'
import { useDailyProgress } from './hooks/useDailyProgress'
import './MarioHitBlock.css'

function MarioHitBlock() {
  // Auth and data hooks
  const { user, profile, signOut } = useAuth()
  const { habits, addHabit: addHabitToDb, loading: habitsLoading } = useHabits(user?.id)
  const {
    completions,
    todaysCoins,
    dayCount,
    completeHabit,
    checkAndResetDaily,
    loading: progressLoading
  } = useDailyProgress(user?.id)

  // UI state
  const [marioPosition, setMarioPosition] = useState(0) // pixel position (center = 0)
  const [isJumping, setIsJumping] = useState(false)
  const [poppingCoin, setPoppingCoin] = useState(null)
  const [facingDirection, setFacingDirection] = useState('right') // 'left' or 'right'
  const [keysPressed, setKeysPressed] = useState({ left: false, right: false })
  const [showModal, setShowModal] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [scrollPosition, setScrollPosition] = useState(0)

  // Check for daily reset on mount
  useEffect(() => {
    if (profile) {
      checkAndResetDaily(profile)
    }
  }, [profile])

  const MOVE_SPEED = 6 // pixels per frame

  // Dynamically calculate block positions based on number of habits
  const getBlockPositions = () => {
    const spacing = 320 // 120px block + 200px gap
    const numBlocks = habits.length
    const positions = []

    for (let i = 0; i < numBlocks; i++) {
      const position = i * spacing
      positions.push(position)
    }

    return positions
  }

  const BLOCK_POSITIONS = getBlockPositions()

  // Get which block Mario is currently under (if any)
  const getCurrentBlockIndex = () => {
    const THRESHOLD = 50 // How close Mario needs to be to hit a block (reduced for better precision)
    for (let i = 0; i < BLOCK_POSITIONS.length; i++) {
      if (Math.abs(marioPosition - BLOCK_POSITIONS[i]) < THRESHOLD) {
        return i
      }
    }
    return -1
  }

  // Keyboard controls - track key states
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard input if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'ArrowLeft') {
        setKeysPressed(prev => ({ ...prev, left: true }))
        setFacingDirection('left')
      } else if (e.key === 'ArrowRight') {
        setKeysPressed(prev => ({ ...prev, right: true }))
        setFacingDirection('right')
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        handleJump()
      }
    }

    const handleKeyUp = (e) => {
      // Ignore keyboard input if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'ArrowLeft') {
        setKeysPressed(prev => ({ ...prev, left: false }))
      } else if (e.key === 'ArrowRight') {
        setKeysPressed(prev => ({ ...prev, right: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isJumping, marioPosition, completions, habits])

  // Continuous movement loop
  useEffect(() => {
    let animationFrameId

    const updatePosition = () => {
      if (keysPressed.left) {
        setMarioPosition(prev => prev - MOVE_SPEED)
      }
      if (keysPressed.right) {
        setMarioPosition(prev => prev + MOVE_SPEED)
      }

      animationFrameId = requestAnimationFrame(updatePosition)
    }

    if (keysPressed.left || keysPressed.right) {
      animationFrameId = requestAnimationFrame(updatePosition)
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [keysPressed])

  // Scroll logic - only scroll when Mario gets close to edges
  useEffect(() => {
    const gameArea = document.querySelector('.game-area')
    if (!gameArea) return

    const viewportWidth = gameArea.clientWidth
    const scrollWidth = gameArea.scrollWidth
    const maxScroll = scrollWidth - viewportWidth
    const currentScroll = gameArea.scrollLeft

    // Mario's world position
    const marioWorldX = marioPosition + 200

    // Calculate Mario's position on screen
    const marioScreenX = marioWorldX - currentScroll

    // Define boundaries - only scroll when Mario gets close to edges
    const rightBoundary = viewportWidth - 100 // 100px from right edge
    const leftBoundary = 200 // 200px from left edge

    let newScroll = currentScroll

    // Scroll right if Mario goes beyond right boundary
    if (marioScreenX > rightBoundary) {
      newScroll = currentScroll + (marioScreenX - rightBoundary)
    }
    // Scroll left if Mario goes before left boundary
    else if (marioScreenX < leftBoundary && currentScroll > 0) {
      newScroll = currentScroll - (leftBoundary - marioScreenX)
    }

    // Clamp to valid range
    newScroll = Math.max(0, Math.min(newScroll, maxScroll))

    gameArea.scrollLeft = newScroll
    setScrollPosition(newScroll)
  }, [marioPosition])

  const handleJump = async () => {
    if (isJumping) return

    const blockIndex = getCurrentBlockIndex()
    console.log('Mario position:', marioPosition, 'Block index:', blockIndex)

    if (blockIndex === -1) {
      // Not under any block, just jump
      setIsJumping(true)
      setTimeout(() => setIsJumping(false), 400)
      return
    }

    const currentHabitId = habits[blockIndex].id
    console.log('Hitting block with habit ID:', currentHabitId)

    if (completions.has(currentHabitId)) {
      // Block already hit today, just jump
      setIsJumping(true)
      setTimeout(() => setIsJumping(false), 400)
      return
    }

    setIsJumping(true)

    // Play coin sound at the peak of jump (200ms)
    setTimeout(() => {
      const coinSound = new Audio('/mario-assets/coin.mp3')
      coinSound.volume = 0.3
      coinSound.play().catch(err => console.log('Sound play failed:', err))
    }, 200)

    setTimeout(async () => {
      // Hit the block - save to Supabase
      await completeHabit(currentHabitId)
      setPoppingCoin(currentHabitId)
      setIsJumping(false)

      setTimeout(() => {
        setPoppingCoin(null)
      }, 1000)
    }, 400)
  }

  const handleAddHabit = async () => {
    if (newHabitName.trim()) {
      const { error } = await addHabitToDb(newHabitName.trim())
      if (!error) {
        setNewHabitName('')
        setShowModal(false)
      } else {
        console.error('Failed to add habit:', error)
      }
    }
  }

  return (
    <div className="mario-hit-game">
      {/* HUD */}
      <div className="game-hud">
        <div className="hud-title">HABIT TRACKER</div>
        <div className="hud-center">
          <div className="hud-stat">
            <img src="/mario-assets/coin.svg" alt="coin" className="hud-coin" />
            <div className="hud-value">×{todaysCoins.toString().padStart(2, '0')}</div>
          </div>
          <div className="hud-stat">
            <div className="hud-label">DAY</div>
            <div className="hud-value">{dayCount}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifySelf: 'end', alignItems: 'center' }}>
          <button className="add-habit-btn" onClick={() => setShowModal(true)}>
            Add Habit
          </button>
          <button
            className="add-habit-btn logout-btn"
            onClick={signOut}
            title="Log Out"
          >
            <img src="/mario-assets/logout-icon.svg" alt="Logout" style={{ width: '24px', height: '24px' }} />
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="game-area">
        <div className="game-content">
          {/* Background Clouds */}
          <div className="clouds-background">
            <img src="/mario-assets/cloud-sm.svg" alt="cloud" className="cloud cloud-1" />
            <img src="/mario-assets/cloud-lg.svg" alt="cloud" className="cloud cloud-2" />
            <img src="/mario-assets/cloud-sm.svg" alt="cloud" className="cloud cloud-3" />
            <img src="/mario-assets/cloud-lg.svg" alt="cloud" className="cloud cloud-4" />
            <img src="/mario-assets/cloud-sm.svg" alt="cloud" className="cloud cloud-5" />
          </div>

          {/* Background Hills */}
          <div className="hills-background">
            <img src="/mario-assets/hill-lg.svg" alt="hill" className="hill hill-1" />
            <img src="/mario-assets/hill-xl.svg" alt="hill" className="hill hill-2" />
            <img src="/mario-assets/hill-sm.svg" alt="hill" className="hill hill-3" />
            <img src="/mario-assets/hill-lg.svg" alt="hill" className="hill hill-4" />
            <img src="/mario-assets/hill-sm.svg" alt="hill" className="hill hill-5" />
            <img src="/mario-assets/hill-xl.svg" alt="hill" className="hill hill-6" />
          </div>

          {/* Blocks Container */}
          <div className="blocks-container">
            {/* Blocks Row */}
            <div className="blocks-row">
            {habits.map((habit, index) => (
              <div key={habit.id} className="block-column">
                {/* Popping Coin */}
                {poppingCoin === habit.id && (
                  <div className="coin-pop">
                    <img src="/mario-assets/coin.svg" alt="coin" className="popping-coin-img" />
                  </div>
                )}

                {/* Question Block */}
                <div className={`block-container ${isJumping && getCurrentBlockIndex() === index ? 'bounce' : ''}`}>
                  <img
                    src="/mario-assets/block-question.svg"
                    alt="block"
                    className={`question-block ${completions.has(habit.id) ? 'hit' : ''}`}
                  />
                  {/* Habit Label on Block */}
                  <div className="block-label">{habit.name}</div>
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Single Mario */}
          <div className="mario-container" style={{
            transform: `translateX(${marioPosition + 200 - scrollPosition}px) scaleX(${facingDirection === 'left' ? -1 : 1})`
          }}>
            <img
              src={(isJumping || keysPressed.left || keysPressed.right) ? '/mario-assets/mario-jump.svg' : '/mario-assets/mario-idle.svg'}
              alt="Mario"
              className={`mario-character ${isJumping ? 'jumping' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Ground */}
      <div className="ground">
        {Array.from({ length: 50 }).map((_, i) => (
          <img
            key={i}
            src="/mario-assets/grass-lg.svg"
            alt="grass"
            className="grass-tile"
          />
        ))}
      </div>

      <div className="keyboard-hint">Use Arrow Keys to move, Space/↑ to jump</div>

      {/* Add Habit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            <h2 className="modal-title">NEW HABIT</h2>
            <p className="modal-subtitle">Enter habit name:</p>
            <input
              type="text"
              className="habit-input"
              placeholder="Read for 20 min"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-btn add-btn" onClick={handleAddHabit}>
                Add Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarioHitBlock
