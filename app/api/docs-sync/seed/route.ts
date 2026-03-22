import { syncAllDocsPayloads } from '@/lib/docs-sync/syncAll'

export async function POST() {
  const summary = await syncAllDocsPayloads()
  const failedResult = summary.results.find((result) => !result.ok)

  return Response.json(
    {
      ok: failedResult === undefined,
      total: summary.totalAttempted,
      succeeded: summary.totalSucceeded,
      failed: summary.totalFailed,
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
