import Link from 'next/link'

export default function FloatingAiTestLink() {
  return (
    <Link href="/ai-test" className="floating-ai-test-link" aria-label="Open AI connectivity test page">
      AI Test
    </Link>
  )
}
