import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useHabits(userId) {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadHabits()
    }
  }, [userId])

  const loadHabits = async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('position', { ascending: true })

      if (error) throw error
      setHabits(data || [])
    } catch (error) {
      console.error('Error loading habits:', error)
    } finally {
      setLoading(false)
    }
  }

  const addHabit = async (name) => {
    try {
      const position = habits.length
      const { data, error } = await supabase
        .from('habits')
        .insert([
          { user_id: userId, name, position }
        ])
        .select()
        .single()

      if (error) throw error

      setHabits([...habits, data])
      return { data, error: null }
    } catch (error) {
      console.error('Error adding habit:', error)
      return { data: null, error: error.message }
    }
  }

  const deleteHabit = async (habitId) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('id', habitId)

      if (error) throw error

      setHabits(habits.filter(h => h.id !== habitId))
      return { error: null }
    } catch (error) {
      console.error('Error deleting habit:', error)
      return { error: error.message }
    }
  }

  return {
    habits,
    loading,
    addHabit,
    deleteHabit,
    refreshHabits: loadHabits,
  }
}
