export type EditableAccountProfileFields = {
  bio: string | null
  favoriteGames: string | null
  profileImagePath: string | null
}

const BIO_MAX_LENGTH = 2000
const FAVORITE_GAMES_MAX_LENGTH = 250

const normalizeOptionalText = (value: unknown, maxLength: number, fieldName: string) => {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`)
  }

  const normalized = value.trim()

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`)
  }

  return normalized || null
}

const readString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export const editableAccountProfileKeys = ['bio', 'favoriteGames', 'profileImagePath'] as const

export const getEditableAccountProfileFields = (profileData: Record<string, unknown>): EditableAccountProfileFields => ({
  bio: readString(profileData.bio),
  favoriteGames: readString(profileData.favoriteGames),
  profileImagePath: readString(profileData.profileImagePath),
})

export const parseEditableAccountProfileFields = (profileData: Record<string, unknown>) => ({
  bio: normalizeOptionalText(profileData.bio, BIO_MAX_LENGTH, 'Bio'),
  favoriteGames: normalizeOptionalText(profileData.favoriteGames, FAVORITE_GAMES_MAX_LENGTH, 'Favorite games'),
})

export const profileFieldLimits = {
  bio: BIO_MAX_LENGTH,
  favoriteGames: FAVORITE_GAMES_MAX_LENGTH,
}
