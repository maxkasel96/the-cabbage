# Docs sync payload contract

The Next.js app sends docs-sync payloads to the deployed Forge web trigger. This contract keeps those webhook requests explicit and stable before additional page-routing logic is added.

## Canonical payload shape

```ts
{
  source: string
  eventType: 'docs-sync-test' | 'feature-create' | 'feature-update' | 'feature-delete'
  timestamp: string
  feature: string
  summary: string
  message: string
  data?: Record<string, unknown>
}
```

## Allowed `eventType` values

- `docs-sync-test`
- `feature-create`
- `feature-update`
- `feature-delete`

Hyphen-case `eventType` values are the canonical format in the Next.js app.

## Sample payload

```json
{
  "source": "nextjs-app",
  "eventType": "feature-update",
  "timestamp": "2026-03-20T00:00:00.000Z",
  "feature": "docs-sync",
  "summary": "Testing Next.js to Forge to Confluence sync",
  "message": "This is a test sync sent from the Next.js API route.",
  "data": {
    "pageId": "21692417"
  }
}
```

## Field intent

- `summary`: short human-readable overview
- `message`: primary body text for the sync event
- `data`: structured metadata for downstream routing and rendering

## Compatibility note

The canonical format is hyphen-case for every `eventType` value. The deployed Forge validation currently accepts `feature-update`, so the test route uses that value until Forge is expanded to accept the rest of the documented contract.
