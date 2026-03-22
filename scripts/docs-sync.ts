declare const process: {
  env: Record<string, string | undefined>
  exit(code?: number): never
}

import { syncAllDocsPayloads } from '../lib/docs-sync/syncAll'

async function main() {
  const webhookUrl = process.env.CONFLUENCE_DOCS_WEBHOOK_URL

  if (!webhookUrl) {
    console.error('Missing CONFLUENCE_DOCS_WEBHOOK_URL')
    process.exit(1)
  }

  const summary = await syncAllDocsPayloads({
    webhookUrl,
    onResult(result) {
      const statusLabel = result.ok ? 'success' : 'failure'
      console.log(
        `${result.title} | ${result.pageType} | ${statusLabel} | ${result.status}`
      )
    },
  })

  console.log('')
  console.log('Docs sync summary')
  console.log(`Total attempted: ${summary.totalAttempted}`)
  console.log(`Total succeeded: ${summary.totalSucceeded}`)
  console.log(`Total failed: ${summary.totalFailed}`)

  if (summary.totalFailed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Docs sync failed')
  console.error(error)
  process.exit(1)
})
