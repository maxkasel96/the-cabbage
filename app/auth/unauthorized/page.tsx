import Link from 'next/link'

type UnauthorizedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const reason = Array.isArray(resolvedSearchParams.reason)
    ? resolvedSearchParams.reason[0]
    : resolvedSearchParams.reason

  const isPlayerAuthorizationFailure = reason === 'player'

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1>{isPlayerAuthorizationFailure ? 'Player login required' : 'Admin access required'}</h1>
        <p>
          {isPlayerAuthorizationFailure
            ? 'Your Google account is signed in, but it is not linked to an approved player login yet. Contact an admin to assign your player account.'
            : 'Your account is signed in but does not have an admin role. Contact an existing admin if you need elevated access.'}
        </p>
        <Link href="/">Return home</Link>
      </div>
    </main>
  )
}
