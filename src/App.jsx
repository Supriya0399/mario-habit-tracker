import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [habits, setHabits] = useState([])
  const [showHabitModal, setShowHabitModal] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedHabits = localStorage.getItem('habitTrackerHabits')
    if (savedHabits) {
      setHabits(JSON.parse(savedHabits))
    }
  }, [])

  // Save data to localStorage whenever habits change
  useEffect(() => {
    localStorage.setItem('habitTrackerHabits', JSON.stringify(habits))
  }, [habits])

  const addHabit = (habitName) => {
    const newHabit = {
      id: Date.now(),
      name: habitName,
      streak: 0,
      lastCompleted: null,
      completions: []
    }
    setHabits([...habits, newHabit])
    setShowHabitModal(false)
  }

  const toggleHabit = (habitId) => {
    const today = new Date().toDateString()

    setHabits(habits.map(habit => {
      if (habit.id === habitId) {
        const alreadyCompletedToday = habit.completions?.includes(today)

        if (alreadyCompletedToday) {
          // Unchecking - remove today's completion
          return {
            ...habit,
            completions: habit.completions.filter(date => date !== today),
            streak: Math.max(0, habit.streak - 1)
          }
        } else {
          // Checking - add today's completion
          const newCompletions = [...(habit.completions || []), today]
          const newStreak = calculateStreak(newCompletions)
          return {
            ...habit,
            completions: newCompletions,
            lastCompleted: today,
            streak: newStreak
          }
        }
      }
      return habit
    }))
  }

  const calculateStreak = (completions) => {
    if (!completions || completions.length === 0) return 0

    const sortedDates = completions
      .map(date => new Date(date))
      .sort((a, b) => b - a)

    let streak = 1
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mostRecent = sortedDates[0]
    mostRecent.setHours(0, 0, 0, 0)
    const daysDiff = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24))

    if (daysDiff > 1) return 0

    for (let i = 1; i < sortedDates.length; i++) {
      const current = sortedDates[i]
      const previous = sortedDates[i - 1]
      const diff = Math.floor((previous - current) / (1000 * 60 * 60 * 24))

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  const isHabitCompletedToday = (habit) => {
    const today = new Date().toDateString()
    return habit.completions?.includes(today) || false
  }

  const getPlantForStreak = (streak) => {
    if (streak >= 30) return '🌳'
    if (streak >= 14) return '🌺'
    if (streak >= 7) return '🌿'
    if (streak >= 3) return '🌱'
    return '🌰'
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const completedToday = habits.filter(h => isHabitCompletedToday(h)).length

  return (
    <div className="app">
      <div className="journal-container">
        <header className="journal-header">
          <div className="header-content">
            <div className="date-badge">{getTodayDate()}</div>
            <h1>My Habit Journal</h1>
            <p className="journal-subtitle">
              {habits.length === 0
                ? "Begin your journey today"
                : `${completedToday} of ${habits.length} completed today`}
            </p>
          </div>
        </header>

        {habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌱</div>
            <h2>Welcome to Your Journey</h2>
            <p>Every great change starts with a single step. What habit would you like to cultivate today?</p>
            <button className="btn-primary" onClick={() => setShowHabitModal(true)}>
              Plant Your First Seed
            </button>
          </div>
        ) : (
          <>
            {/* Progress Garden - Top */}
            <div className="garden-section">
              <div className="section-header">
                <h2>Your Growing Garden</h2>
                <p className="section-description">Watch your habits bloom as you stay consistent</p>
              </div>
              <div className="progress-garden">
                {habits.filter(h => h.streak > 0).length === 0 ? (
                  <div className="garden-empty">
                    <span className="garden-empty-icon">🌿</span>
                    <p>Complete your first habit to start growing your garden</p>
                  </div>
                ) : (
                  habits
                    .filter(h => h.streak > 0)
                    .map(habit => (
                      <div key={habit.id} className="plant">
                        <div className="plant-icon">{getPlantForStreak(habit.streak)}</div>
                        <div className="plant-label">{habit.name}</div>
                        <div className="plant-days">{habit.streak} day{habit.streak !== 1 ? 's' : ''}</div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Habits List - Bottom */}
            <div className="habits-section">
              <div className="section-header">
                <h2>Today's Habits</h2>
                <button className="btn-add" onClick={() => setShowHabitModal(true)}>
                  + Add Habit
                </button>
              </div>

              <div className="habits-list">
                {habits.map(habit => (
                  <div key={habit.id} className="habit-card">
                    <button
                      className={`habit-check ${isHabitCompletedToday(habit) ? 'checked' : ''}`}
                      onClick={() => toggleHabit(habit.id)}
                    >
                      {isHabitCompletedToday(habit) && <span className="checkmark">✓</span>}
                    </button>
                    <div className="habit-content">
                      <h3 className={isHabitCompletedToday(habit) ? 'completed' : ''}>{habit.name}</h3>
                      <div className="habit-meta">
                        {habit.streak > 0 && (
                          <span className="streak-indicator">
                            💧 {habit.streak} day{habit.streak !== 1 ? 's' : ''}
                          </span>
                        )}
                        {habit.completions?.length > 0 && (
                          <span className="total-completions">
                            {habit.completions.length} total
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Habit Modal */}
      {showHabitModal && (
        <HabitModal
          onClose={() => setShowHabitModal(false)}
          onSubmit={addHabit}
        />
      )}
    </div>
  )
}

function HabitModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
      setName('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Plant a New Habit</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>What would you like to cultivate?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning meditation, read before bed, practice gratitude..."
              autoFocus
              required
            />
          </div>
          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Not Yet
            </button>
            <button type="submit" className="btn-primary">
              Plant This Seed
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
