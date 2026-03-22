# Docs sync payload contract

The Next.js app sends docs-sync payloads to the deployed Forge web trigger. The same payload contract is now used for both normal sync events and the initial documentation seed flow so seeded pages reuse the standard Forge routing and Confluence update path.

## Canonical payload shape

```ts
{
  source: string
  eventType:
    | 'docs-sync-test'
    | 'feature-create'
    | 'feature-update'
    | 'feature-delete'
    | 'integration-create'
    | 'integration-update'
    | 'integration-delete'
  timestamp: string
  feature?: string
  system?: string
  integration?: string
  release?: string
  incidentId?: string
  pageType?: 'feature-page' | 'integration-page' | 'runbook-page' | 'release-page' | 'incident-page'
  title?: string
  externalId?: string
  summary: string
  message: string
  content?: string
  data?: {
    pageType?: 'feature-page' | 'integration-page' | 'runbook-page' | 'release-page' | 'incident-page'
    seedKey?: string
    detail?: {
      summary?: string
      summaryDetails?: {
        what?: string
        whyItExists?: string
        whoUsesIt?: string[]
        flow?: string[]
        dependencies?: string[]
        inputsAndOutputs?: string[]
        expectedBehavior?: string[]
        failurePointsAndRisks?: string[]
        operationalConsiderations?: string[]
        limitationsAndFutureImprovements?: string[]
      }
      status?: string
      owner?: string
      owningArea?: string
      currentState?: string
      connectedSystem?: string
      notes?: string[]
      relatedFeatures?: string[]
      relatedIntegrations?: string[]
    }
  }
}
```

## Seed flow

The initial documentation seed lives in `lib/docs-sync/seedData.ts` and is converted into standard docs-sync payloads by `lib/docs-sync/seedPayloads.ts`.

- Features map to `pageType: 'feature-page'` and `eventType: 'feature-update'`
- Integrations map to `pageType: 'integration-page'` and `eventType: 'integration-update'`
- Runbooks map to `pageType: 'runbook-page'` and `eventType: 'runbook-update'`
- Both paths send structured `data.detail` fields so Forge can render lightweight detail sections without a one-off template path
- Richer Summary sections now come from `data.detail.summaryDetails`, while the original top-level `summary` string remains in place for compatibility and indexing

## Local seed runner

Start the app locally, then run:

```bash
npm run docs:seed
```

That script calls `POST /api/docs-sync/seed`, which builds the seed payload inventory and forwards each payload through the existing `/api/docs-sync` → Forge webhook flow.

If your app is running on a non-default URL, set `DOCS_SEED_BASE_URL` first.

## Manual Forge webhook sync

To send the full features + integrations + runbooks seed set directly to Forge in one terminal run:

```bash
export CONFLUENCE_DOCS_WEBHOOK_URL='https://your-forge-webhook-url'
npm run docs:sync
```

The runner reuses the existing seed payload builders, sends each payload sequentially to the Forge webhook, logs one line per payload, and prints a final success/failure summary.
