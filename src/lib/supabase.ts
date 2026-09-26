import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('TU-PROYECTO')
)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y llena tus datos de Supabase (ver README).'
  )
}

// createClient truena si la URL viene vacía, lo que dejaría la pantalla en blanco.
// Con valores de relleno la app arranca y App muestra el aviso de configuración.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://sin-configurar.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'sin-configurar',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
)

export const WAMI_PHOTOS_BUCKET = 'wami-photos'

/** Genera un id para un archivo dentro del bucket de fotos, ya organizado por tipo de registro. */
export function buildPhotoPath(entityType: 'product' | 'order' | 'expense', entityId: string, fileExt: string) {
  const stamp = Date.now()
  return `${entityType}/${entityId}/${stamp}.${fileExt}`
}
