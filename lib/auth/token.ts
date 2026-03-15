const COOKIE_NAME = 'sb-access-token'

const extractBearerToken = (value: string | null) => {
  if (!value?.startsWith('Bearer ')) {
    return null
  }

  return value.slice(7)
}

export const getAccessTokenFromCookie = (cookieHeader: string | null) => {
  if (!cookieHeader) {
    return null
  }

  const tokens = cookieHeader.split(';').map((part) => part.trim())
  const match = tokens.find((part) => part.startsWith(`${COOKIE_NAME}=`))

  if (!match) {
    return null
  }

  const value = match.slice(COOKIE_NAME.length + 1)
  return value ? decodeURIComponent(value) : null
}

export const getAccessTokenFromRequest = (req: Request) => {
  const headerToken = extractBearerToken(req.headers.get('authorization'))

  if (headerToken) {
    return headerToken
  }

  return getAccessTokenFromCookie(req.headers.get('cookie'))
}

export const authCookieName = COOKIE_NAME
