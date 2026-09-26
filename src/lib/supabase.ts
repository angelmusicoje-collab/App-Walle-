import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('TU-PROYECTO')) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y llena tus datos de Supabase (ver README).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})

export const WAMI_PHOTOS_BUCKET = 'wami-photos'

/** Genera un id para un archivo dentro del bucket de fotos, ya organizado por tipo de registro. */
export function buildPhotoPath(entityType: 'product' | 'order' | 'expense', entityId: string, fileExt: string) {
  const stamp = Date.now()
  return `${entityType}/${entityId}/${stamp}.${fileExt}`
}
