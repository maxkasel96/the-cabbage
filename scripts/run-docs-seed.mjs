const baseUrl = process.env.DOCS_SEED_BASE_URL ?? 'http://localhost:3000'
const endpoint = new URL('/api/docs-sync/seed', baseUrl)

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})

const bodyText = await response.text()
let parsedBody

try {
  parsedBody = JSON.parse(bodyText)
} catch {
  parsedBody = bodyText
}

if (!response.ok) {
  console.error(`Docs seed failed (${response.status}):`)
  console.error(parsedBody)
  process.exit(1)
}

console.log(JSON.stringify(parsedBody, null, 2))
