import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BusinessSettings, ExpenseCategory, Profile } from '../types'

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const { data } = await supabase.from('business_settings').select('*').eq('id', true).single()
    setSettings(data as BusinessSettings | null)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  return { settings, loading, reload }
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setCategories((data as ExpenseCategory[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  return { categories, loading, reload }
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  return { profiles, loading, reload }
}
