'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import PlayerAvatar from '@/app/components/players/PlayerAvatar'

type ProfileImageUploaderProps = {
  displayName: string
  currentImagePath?: string | null
  disabled?: boolean
  onUploadSuccess?: (imagePath: string) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export default function ProfileImageUploader({
  displayName,
  currentImagePath,
  disabled = false,
  onUploadSuccess,
}: ProfileImageUploaderProps) {
  const [imagePath, setImagePath] = useState<string | null>(currentImagePath ?? null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setImagePath(currentImagePath ?? null)
  }, [currentImagePath])

  const handlePickFile = () => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Please upload a PNG, JPEG, or WebP image.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Profile image must be 5MB or smaller.')
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)

    try {
      const res = await fetch('/api/account/profile/image', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(json.error || 'Failed to upload profile image.')
        return
      }

      const nextImagePath = typeof json.profileImagePath === 'string' ? json.profileImagePath : null
      setImagePath(nextImagePath)

      if (nextImagePath) {
        onUploadSuccess?.(nextImagePath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile image.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <PlayerAvatar name={displayName || 'Profile image'} avatarPath={imagePath} className="player-card__avatar" size={72} />
        <div style={{ display: 'grid', gap: 6 }}>
          <button
            type="button"
            onClick={handlePickFile}
            disabled={disabled || uploading}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: disabled || uploading ? 'rgba(130, 134, 121, 0.3)' : 'var(--surface)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            }}
            aria-busy={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload profile image'}
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>PNG, JPG, or WebP only (max 5MB)</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        style={{ display: 'none' }}
      />

      {error ? (
        <div style={{ fontSize: 12, color: '#b42318' }}>
          <strong>{error}</strong>
        </div>
      ) : null}
    </div>
  )
}
