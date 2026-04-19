import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDailyProgress(userId) {
  const [completions, setCompletions] = useState(new Set())
  const [todaysCoins, setTodaysCoins] = useState(0)
  const [totalCoins, setTotalCoins] = useState(0)
  const [dayCount, setDayCount] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadTodaysCompletions()
      loadDayCount()
      loadTotalCoins()
    }
  }, [userId])

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const loadTodaysCompletions = async () => {
    try {
      const today = getTodayDate()
      const { data, error } = await supabase
        .from('daily_completions')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('completion_date', today)

      if (error) throw error

      const completedHabitIds = new Set(data.map(c => c.habit_id))
      setCompletions(completedHabitIds)
      setTodaysCoins(data.length)
    } catch (error) {
      console.error('Error loading completions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDayCount = async () => {
    try {
      const { count, error } = await supabase
        .from('daily_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (error) throw error
      // Day count is the number of days with snapshots + 1 (today)
      setDayCount((count || 0) + 1)
    } catch (error) {
      console.error('Error loading day count:', error)
    }
  }

  const loadTotalCoins = async () => {
    try {
      const { count, error } = await supabase
        .from('daily_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (error) throw error
      setTotalCoins(count || 0)
    } catch (error) {
      console.error('Error loading total coins:', error)
    }
  }

  const completeHabit = async (habitId) => {
    try {
      const today = getTodayDate()

      // Check if already completed
      if (completions.has(habitId)) {
        return { error: 'Habit already completed today' }
      }

      const { data, error } = await supabase
        .from('daily_completions')
        .insert([
          {
            user_id: userId,
            habit_id: habitId,
            completion_date: today
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Update local state
      setCompletions(new Set([...completions, habitId]))
      setTodaysCoins(prev => prev + 1)
      setTotalCoins(prev => prev + 1)

      return { data, error: null }
    } catch (error) {
      console.error('Error completing habit:', error)
      return { data: null, error: error.message }
    }
  }

  const checkAndResetDaily = async (profile) => {
    try {
      const today = getTodayDate()
      const lastActiveDate = profile.last_active_date

      if (today !== lastActiveDate) {
        // New day detected!
        console.log('New day detected! Resetting...')

        // Create snapshot for yesterday (even if no habits completed)
        if (lastActiveDate) {
          // Query yesterday's actual completions from database
          const { data: yesterdayCompletions, error: queryError } = await supabase
            .from('daily_completions')
            .select('habit_id')
            .eq('user_id', userId)
            .eq('completion_date', lastActiveDate)

          if (queryError) {
            console.error('Error querying yesterday completions:', queryError)
          }

          const yesterdayCount = yesterdayCompletions?.length || 0

          const { error: snapshotError } = await supabase
            .from('daily_snapshots')
            .insert([
              {
                user_id: userId,
                snapshot_date: lastActiveDate,
                coins_earned: yesterdayCount,
                habits_completed: yesterdayCount,
                day_number: dayCount
              }
            ])

          if (snapshotError) {
            console.error('Error creating snapshot:', snapshotError)
          }
        }

        // Update last_active_date to today
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_active_date: today })
          .eq('id', userId)

        if (updateError) throw updateError

        // Reload completions (will be empty for new day)
        await loadTodaysCompletions()
        await loadDayCount()
      }
    } catch (error) {
      console.error('Error in daily reset:', error)
    }
  }

  return {
    completions,
    todaysCoins,
    totalCoins,
    dayCount,
    loading,
    completeHabit,
    checkAndResetDaily,
    refreshCompletions: loadTodaysCompletions,
  }
}
