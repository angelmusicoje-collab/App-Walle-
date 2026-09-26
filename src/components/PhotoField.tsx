import { useEffect, useRef, useState } from 'react'
import { supabase, WAMI_PHOTOS_BUCKET, buildPhotoPath } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Photo, PhotoEntity, PhotoKind } from '../types'

interface Props {
  entityType: PhotoEntity
  entityId: string | null // null mientras el registro aún no existe (se sube después de guardar)
  kind?: PhotoKind
  label?: string
  onPendingFile?: (file: File | null) => void // usado cuando entityId aún es null
}

/** Botón + preview para tomar foto con la cámara o elegir de la galería, y subirla a Storage. */
export function PhotoField({ entityType, entityId, kind = 'foto', label = 'Fotografía', onPendingFile }: Props) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (entityId) loadPhotos()
  }, [entityId])

  async function loadPhotos() {
    if (!entityId) return
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('kind', kind)
      .order('created_at', { ascending: false })
    const list = (data as Photo[]) ?? []
    setPhotos(list)
    if (list[0]) {
      const { data: signed } = await supabase.storage
        .from(WAMI_PHOTOS_BUCKET)
        .createSignedUrl(list[0].storage_path, 3600)
      setPreviewUrl(signed?.signedUrl ?? null)
    }
  }

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen (foto).')
      return
    }
    setPreviewUrl(URL.createObjectURL(file))

    if (!entityId) {
      // El registro aún no existe: guardamos el archivo para subirlo justo después de crear el registro.
      onPendingFile?.(file)
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = buildPhotoPath(entityType, entityId, ext)
      const { error: upErr } = await supabase.storage.from(WAMI_PHOTOS_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
      if (upErr) throw upErr
      const { error: dbErr } = await supabase.from('photos').insert({
        entity_type: entityType,
        entity_id: entityId,
        kind,
        storage_path: path,
        uploaded_by: user?.id ?? null
      })
      if (dbErr) throw dbErr
      await loadPhotos()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto. Revisa tu conexión.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="photo-field">
      <label className="field-label">{label}</label>
      <div className="photo-field-row">
        {previewUrl ? (
          <img src={previewUrl} alt={label} className="photo-preview" />
        ) : (
          <div className="photo-preview photo-preview-empty">📷</div>
        )}
        <div className="photo-field-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={uploading}
            onClick={() => inputRef.current?.setAttribute('capture', 'environment') || inputRef.current?.click()}
          >
            📷 Tomar foto
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={uploading}
            onClick={() => {
              inputRef.current?.removeAttribute('capture')
              inputRef.current?.click()
            }}
          >
            🖼️ Galería
          </button>
        </div>
      </div>
      {uploading && <p className="hint">Subiendo foto…</p>}
      {error && <p className="error-text">{error}</p>}
      {photos.length > 1 && <p className="hint">{photos.length} fotos guardadas</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
