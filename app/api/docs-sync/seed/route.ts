import { buildSeedDocsSyncPayloads } from '@/lib/docs-sync/seedPayloads'
import { sendDocsSyncPayload } from '@/lib/docs-sync/sendPayload'

export async function POST() {
  const payloads = buildSeedDocsSyncPayloads()
  const results = [] as Array<{
    pageType: string | undefined
    title: string | undefined
    status: number
    ok: boolean
    forgeResponse: unknown
  }>

  for (const payload of payloads) {
    const result = await sendDocsSyncPayload(payload)

    results.push({
      pageType: payload.pageType ?? payload.data?.pageType,
      title: payload.feature ?? payload.integration,
      status: result.status,
      ok: result.ok,
      forgeResponse: result.forgeResponse,
    })
  }

  const failedResult = results.find((result) => !result.ok)

  return Response.json(
    {
      ok: failedResult === undefined,
      total: results.length,
      sent: results.map((result) => ({
        pageType: result.pageType,
        title: result.title,
        status: result.status,
        ok: result.ok,
      })),
      results,
    },
    {
      status: failedResult ? failedResult.status : 200,
    }
  )
}
