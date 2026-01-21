import Image from 'next/image'
import { getAvatarPublicUrl } from '@/lib/getAvatarPublicUrl'

type PlayerAvatarProps = {
  name: string
  avatarPath?: string | null
  className?: string
  size?: number
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export default function PlayerAvatar({ name, avatarPath, className, size = 48 }: PlayerAvatarProps) {
  const initials = getInitials(name) || '?'
  const publicUrl = getAvatarPublicUrl(avatarPath)
  const fallbackProps = publicUrl ? {} : { role: 'img', 'aria-label': `Avatar for ${name}` }

  return (
    <div className={className} {...fallbackProps}>
      {publicUrl ? (
        <Image src={publicUrl} alt={`Avatar for ${name}`} width={size} height={size} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  )
}
