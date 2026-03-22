import { buildDocsSeedInventory } from '@/lib/docs-sync/seedPayloads'
import { syncAllDocsPayloads } from '@/lib/docs-sync/syncAll'

export async function POST() {
  const inventory = buildDocsSeedInventory()
  const summary = await syncAllDocsPayloads({ payloads: inventory.payloads })
  const failedResult = summary.results.find((result) => !result.ok)

  return Response.json(
    {
      ok: failedResult === undefined,
      total: summary.totalAttempted,
      succeeded: summary.totalSucceeded,
      failed: summary.totalFailed,
      discovery: {
        features: inventory.discovery.features.map((candidate) => ({
          title: candidate.title,
          key: candidate.key,
          sourceFiles: candidate.sourceFiles,
        })),
        integrations: inventory.discovery.integrations.map((candidate) => ({
          title: candidate.title,
          key: candidate.key,
          sourceFiles: candidate.sourceFiles,
        })),
        runbooks: inventory.discovery.runbooks.map((candidate) => ({
          title: candidate.title,
          key: candidate.key,
          sourceFiles: candidate.sourceFiles,
        })),
      },
      sent: summary.results.map((result) => ({
        pageType: result.pageType,
        title: result.title,
        status: result.status,
        ok: result.ok,
      })),
      results: summary.results,
    },
    {
      status: failedResult ? failedResult.status : 200,
    }
  )
}
