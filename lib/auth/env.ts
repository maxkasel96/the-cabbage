// Auth environment flags used to gate provider options by deployment context.
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
export const isProduction =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' || (!isDevelopment && !isPreview)

export const canUsePasswordAuth = isDevelopment || isPreview
