import assert from 'node:assert/strict'

const { buildFeatureSeedPayload, buildIntegrationSeedPayload, buildRunbookSeedPayload, buildSeedDocsSyncPayloads } =
  await import('../.tmp-docs-sync-tests/seedPayloads.js')
const { featureDocSeeds, integrationDocSeeds, runbookDocSeeds } = await import('../.tmp-docs-sync-tests/seedData.js')

const runbookSeed = runbookDocSeeds[0]
const runbookPayload = buildRunbookSeedPayload(runbookSeed)

assert.equal(runbookPayload.source, 'nextjs-app')
assert.equal(runbookPayload.eventType, 'runbook-update')
assert.equal(runbookPayload.pageType, 'runbook-page')
assert.equal(runbookPayload.title, 'Runbook - Associate Players with Emails')
assert.equal(runbookPayload.externalId, 'nextjs-app:runbook-page:associate-players-with-emails')
assert.match(runbookPayload.content ?? '', /<h1>Runbook - Associate Players with Emails<\/h1>/)
assert.equal(runbookPayload.data?.pageType, 'runbook-page')

const featurePayload = buildFeatureSeedPayload(featureDocSeeds[0])
const integrationPayload = buildIntegrationSeedPayload(integrationDocSeeds[0])
const payloads = buildSeedDocsSyncPayloads()

assert.equal(featurePayload.eventType, 'feature-update')
assert.equal(featurePayload.pageType, 'feature-page')
assert.equal(featurePayload.feature, featureDocSeeds[0]?.name)
assert.equal(integrationPayload.eventType, 'integration-update')
assert.equal(integrationPayload.pageType, 'integration-page')
assert.equal(integrationPayload.integration, integrationDocSeeds[0]?.name)
assert.equal(payloads.length, featureDocSeeds.length + integrationDocSeeds.length + runbookDocSeeds.length)

console.log('docs-sync assertions passed')
