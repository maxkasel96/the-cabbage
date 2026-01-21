'use client'

import { useEffect, useRef, useState } from 'react'
import PlayerAvatar from './PlayerAvatar'

type AvatarUploaderProps = {
  playerId: string
  playerName: string
  currentAvatarPath?: string | null
  onUploadSuccess?: (avatarPath: string) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export default function AvatarUploader({
  playerId,
  playerName,
  currentAvatarPath,
  onUploadSuccess,
}: AvatarUploaderProps) {
  const [avatarPath, setAvatarPath] = useState<string | null>(currentAvatarPath ?? null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAvatarPath(currentAvatarPath ?? null)
  }, [currentAvatarPath])

  const handlePickFile = () => {
    if (uploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Please upload a PNG, JPEG, or WebP image.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Avatar must be 5MB or smaller.')
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const res = await fetch(`/api/players/${playerId}/avatar`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(json.error || 'Failed to upload avatar.')
        setUploading(false)
        event.target.value = ''
        return
      }

      setAvatarPath(json.avatar_path ?? null)
      if (json.avatar_path) {
        onUploadSuccess?.(json.avatar_path)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PlayerAvatar name={playerName} avatarPath={avatarPath} className="player-card__avatar" size={52} />
        <div style={{ display: 'grid', gap: 6 }}>
          <button
            type="button"
            onClick={handlePickFile}
            disabled={uploading}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: uploading ? 'rgba(130, 134, 121, 0.3)' : 'var(--surface)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
            aria-busy={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload avatar'}
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>PNG, JPG, or WebP (max 5MB)</span>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
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
