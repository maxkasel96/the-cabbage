declare const process: {
  env: Record<string, string | undefined>
  exit(code?: number): never
}

import { buildDocsSeedInventory } from '../lib/docs-sync/seedPayloads'
import { syncAllDocsPayloads } from '../lib/docs-sync/syncAll'

async function main() {
  const webhookUrl = process.env.CONFLUENCE_DOCS_WEBHOOK_URL
  const inventory = buildDocsSeedInventory()

  logDiscoverySection('Feature candidates', inventory.discovery.features, (candidate) => candidate.title)
  logDiscoverySection('Integration candidates', inventory.discovery.integrations, (candidate) => candidate.title)
  logDiscoverySection('Runbook candidates', inventory.discovery.runbooks, (candidate) => candidate.title)

  console.log('')
  console.log('Docs seed inventory')
  console.log(`Feature seeds to sync: ${inventory.features.length}`)
  console.log(`Integration seeds to sync: ${inventory.integrations.length}`)
  console.log(`Runbook seeds to sync: ${inventory.runbooks.length}`)

  if (!webhookUrl) {
    console.error('Missing CONFLUENCE_DOCS_WEBHOOK_URL')
    process.exit(1)
  }

  const summary = await syncAllDocsPayloads({
    webhookUrl,
    payloads: inventory.payloads,
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

function logDiscoverySection<T extends { sourceFiles: string[] }>(
  heading: string,
  candidates: T[],
  getTitle: (candidate: T) => string
) {
  console.log(heading)
  console.log(`Found: ${candidates.length}`)

  for (const candidate of candidates) {
    console.log(`- ${getTitle(candidate)}`)
    for (const sourceFile of candidate.sourceFiles) {
      console.log(`  - ${sourceFile}`)
    }
  }

  console.log('')
}

main().catch((error) => {
  console.error('Docs sync failed')
  console.error(error)
  process.exit(1)
})
