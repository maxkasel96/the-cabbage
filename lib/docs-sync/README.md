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
  pageType?: 'feature-page' | 'integration-page' | 'release-page' | 'incident-page'
  summary: string
  message: string
  data?: {
    pageType?: 'feature-page' | 'integration-page' | 'release-page' | 'incident-page'
    seedKey?: string
    detail?: {
      summary?: string
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
- Both paths send structured `data.detail` fields so Forge can render lightweight detail sections without a one-off template path

## Local seed runner

Start the app locally, then run:

```bash
npm run docs:seed
```

That script calls `POST /api/docs-sync/seed`, which builds the seed payload inventory and forwards each payload through the existing `/api/docs-sync` → Forge webhook flow.

If your app is running on a non-default URL, set `DOCS_SEED_BASE_URL` first.
