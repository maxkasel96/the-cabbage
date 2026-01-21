const encodePath = (path: string) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

export const getAvatarPublicUrl = (avatarPath?: string | null) => {
  if (!avatarPath) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  return `${supabaseUrl}/storage/v1/object/public/images/${encodePath(avatarPath)}`
}
