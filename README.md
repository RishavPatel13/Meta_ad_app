# Meta Ad Desk

React UI for the Airtable + n8n Meta ads pipeline.

## Local

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

## Vercel

1. Import this GitHub repo in Vercel.
2. Add these environment variables:

- `AIRTABLE_PAT`
- `AIRTABLE_BASE_ID`
- `N8N_WEBHOOK_URL`

Do not commit `.env`. The personal access token stays in Vercel settings only.
