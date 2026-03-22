import assert from 'node:assert/strict'

const {
  buildFeatureSeedPayload,
  buildIntegrationSeedPayload,
  buildRunbookSeedPayload,
  buildSeedDocsSyncPayloads,
} = await import('../.tmp-docs-sync-tests/seedPayloads.js')
const { featureDocSeeds, integrationDocSeeds, runbookDocSeeds } = await import('../.tmp-docs-sync-tests/seedData.js')
const { syncAllDocsPayloads } = await import('../.tmp-docs-sync-tests/syncAll.js')

const payloads = buildSeedDocsSyncPayloads()
const runbookSeed = runbookDocSeeds[0]
const runbookPayload = buildRunbookSeedPayload(runbookSeed)

assert.equal(runbookPayload.source, 'nextjs-app')
assert.equal(runbookPayload.eventType, 'runbook-update')
assert.equal(runbookPayload.pageType, 'runbook-page')
assert.equal(runbookPayload.runbook, runbookSeed?.name)
assert.equal(runbookPayload.title, 'Runbook - Associate Players with Emails')
assert.equal(runbookPayload.externalId, 'nextjs-app:runbook-page:associate-players-with-emails')
assert.match(runbookPayload.content ?? '', /<h1>Runbook - Associate Players with Emails<\/h1>/)
assert.match(runbookPayload.content ?? '', /<strong>What this is:<\/strong>/)
assert.equal(runbookPayload.data?.pageType, 'runbook-page')
assert.equal(runbookPayload.data?.detail?.summaryDetails?.what, runbookSeed?.summaryDetails.what)
assert.ok((featureDocSeeds[0]?.summaryDetails.flow?.length ?? 0) > 0)

const featurePayload = buildFeatureSeedPayload(featureDocSeeds[0])
const integrationPayload = buildIntegrationSeedPayload(integrationDocSeeds[0])

assert.equal(featurePayload.eventType, 'feature-update')
assert.equal(featurePayload.pageType, 'feature-page')
assert.equal(featurePayload.feature, featureDocSeeds[0]?.name)
assert.equal(integrationPayload.eventType, 'integration-update')
assert.equal(integrationPayload.pageType, 'integration-page')
assert.equal(integrationPayload.integration, integrationDocSeeds[0]?.name)
assert.equal(payloads.length, featureDocSeeds.length + integrationDocSeeds.length + runbookDocSeeds.length)

const summary = await syncAllDocsPayloads({
  payloads,
  sender: async (payload) => ({
    ok: payload.pageType !== 'integration-page',
    status: payload.pageType === 'integration-page' ? 500 : 200,
    forgeResponse: { externalId: payload.externalId },
  }),
})

assert.equal(summary.totalAttempted, payloads.length)
assert.equal(summary.totalSucceeded, featureDocSeeds.length + runbookDocSeeds.length)
assert.equal(summary.totalFailed, integrationDocSeeds.length)
assert.equal(summary.results[0]?.title, payloads[0]?.title)
assert.equal(summary.results[0]?.pageType, payloads[0]?.pageType)
assert.equal(summary.results.find((result) => result.pageType === 'integration-page')?.status, 500)
