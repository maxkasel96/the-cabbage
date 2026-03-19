import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1>Admin access required</h1>
        <p>
          Your account is signed in but does not have an admin role. Contact an existing admin if you need elevated access.
        </p>
        <Link href="/">Return home</Link>
      </div>
    </main>
  )
}
