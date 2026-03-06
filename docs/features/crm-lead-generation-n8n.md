# CRM Lead Generation via n8n Automation

Automated lead generation feature that integrates n8n workflows with the GIMS CRM module.
Enables scraping leads from Google Maps and LinkedIn using free/low-cost APIs, then pushing them
into the ERP via the bulk upsert endpoint.

## Fitur Utama

- Downloadable n8n workflow JSON templates (Google Maps, LinkedIn, Universal)
- Bulk upsert API endpoint (`POST /api/v1/crm/leads/upsert`) with email-based deduplication
- UI button "Generate Leads" in lead list page with source selection dialog
- Dynamic webhook input: `{ type, keyword, city, limit }`
- Copy-to-clipboard webhook payload template with API key placeholders
- Support for free APIs only (Serper.dev, Apify free tier)
- i18n support (English + Indonesian)

## Business Rules

- Email is the deduplication key for upsert: existing leads (by email, unconverted) are updated, new ones are created
- Converted leads are excluded from deduplication (only active leads are matched)
- Max 100 leads per bulk upsert request (enforced by DTO validation)
- Google Maps: max 20 results per Serper search, 2,500 free searches/month
- LinkedIn: max 25 results per Apify run (free tier)
- For Google Maps leads without direct email, workflow derives `info@domain` from website URL
- LinkedIn leads without email are filtered out (email required for deduplication)
- Default lead status ("New") is automatically assigned to newly created leads

## Keputusan Teknis

- **Why email as dedup key instead of phone/name**: Email is the most unique identifier
  available from both Google Maps and LinkedIn. Phone numbers and names have higher collision rates.
  Trade-off: leads without email cannot be upserted via this endpoint.

- **Why n8n workflow JSON download instead of direct API scraping**: n8n runs on the user's own
  infrastructure, avoiding CORS issues and keeping API keys off the frontend. The ERP only receives
  cleaned, mapped lead data. Trade-off: requires user to have an n8n instance.

- **Why Serper.dev for Google Maps**: Free tier (2,500 searches/month) with structured JSON response.
  Alternative Google Maps APIs require billing. Trade-off: rate limits on free tier.

- **Why Apify for LinkedIn**: Free tier scraping without direct LinkedIn API access (which requires
  partner approval). Trade-off: less reliable data, may require LinkedIn cookie for best results.

- **Why bulk upsert instead of individual create**: Reduces HTTP round-trips and allows batch
  processing of scraped results. Trade-off: slightly more complex error handling (partial failures).

## Struktur Folder

```
features/crm/lead/
├── n8n/                              # n8n workflow templates
│   ├── google-maps-workflow.json     # Google Maps scraper workflow
│   ├── linkedin-workflow.json        # LinkedIn scraper workflow
│   └── universal-workflow.json       # Combined workflow with source routing
├── hooks/
│   ├── use-generate-leads.ts         # Hook for generate leads dialog state + actions
│   └── use-leads.ts                  # Added useBulkUpsertLeads mutation
├── services/
│   └── lead-service.ts              # Added bulkUpsert service method
├── components/
│   ├── generate-leads-dialog.tsx    # Dialog for source selection + workflow download
│   └── lead-list.tsx                # Added "Generate Leads" button
├── types/
│   └── index.d.ts                   # Added GenerateLeadsInput, BulkUpsertLeadRequest types
└── i18n/
    ├── en.ts                        # Added generate.* translations
    └── id.ts                        # Added generate.* translations (Indonesian)
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/crm/leads/upsert` | `crm_lead.create` | Bulk upsert leads (email-based dedup) |

### Request Body

```json
{
  "leads": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "company_name": "Acme Corp",
      "email": "john@acme.com",
      "phone": "+62812345678",
      "job_title": "CTO",
      "address": "Jl. Sudirman No. 1",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "lead_source_id": "<uuid>",
      "estimated_value": 50000000,
      "notes": "Source: Google Maps\nRating: 4.5"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "created": 3,
    "updated": 1,
    "errors": 0,
    "items": [...]
  }
}
```

## n8n Workflow Architecture

### Webhook Input Schema

```json
{
  "type": "linkedin" | "google_maps",
  "keyword": "IT Company",
  "city": "Jakarta",
  "limit": 10,
  "lead_source_id": "<uuid>",
  "erp_base_url": "https://your-erp.com",
  "auth_cookie": "access_token=...",
  "csrf_token": "...",
  "serper_api_key": "...",
  "apify_api_key": "..."
}
```

### Workflow Variants

1. **Google Maps Workflow** (`google-maps-workflow.json`):
   - Webhook Trigger -> Serper Maps Search -> Map to Lead Format -> Send to GIMS ERP -> Respond

2. **LinkedIn Workflow** (`linkedin-workflow.json`):
   - Webhook Trigger -> Apify LinkedIn Search -> Map to Lead Format -> Has Valid Leads? -> Send to GIMS ERP / Respond No Leads

3. **Universal Workflow** (`universal-workflow.json`):
   - Webhook Trigger -> Route by Type (If) -> [LinkedIn OR Google Maps] -> Map Data -> Merge -> Has Valid Leads? -> Send to GIMS ERP

## Cara Test Manual

1. Login ke GIMS sebagai user dengan permission `crm_lead.create`
2. Navigate ke `/crm/leads`
3. Klik tombol "Generate Leads" (ikon Zap)
4. Pilih source: Google Maps atau LinkedIn
5. Isi keyword (contoh: "IT Company") dan city (contoh: "Jakarta")
6. Klik "Download Workflow" untuk unduh JSON
7. Import workflow JSON ke n8n instance
8. Klik "Copy Payload" untuk dapatkan template webhook payload
9. Isi API key (Serper/Apify) dan auth credentials
10. Trigger webhook via n8n/Postman
11. Verifikasi leads muncul di daftar leads CRM

### Test Bulk Upsert API Langsung

```bash
curl -X POST http://localhost:8080/api/v1/crm/leads/upsert \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<token>" \
  -H "X-CSRF-Token: <csrf>" \
  -d '{
    "leads": [
      {
        "first_name": "Test",
        "last_name": "Lead",
        "email": "test@example.com",
        "company_name": "Test Corp",
        "city": "Jakarta"
      }
    ]
  }'
```

## Dependencies

- **Backend**: GORM (models + repository), Gin (HTTP handler)
- **Frontend**: TanStack Query (mutation hook), next-intl (i18n), sonner (toast), lucide-react (icons)
- **External**: [Serper.dev](https://serper.dev) (Google Maps API), [Apify](https://apify.com) (LinkedIn scraper), [n8n](https://n8n.io) (workflow automation)

## Notes & Improvements

- **Known Limitation**: LinkedIn scraping via Apify free tier often returns profiles without email addresses, resulting in fewer usable leads
- **Future Improvement**:
  - Add direct n8n API trigger from GIMS (requires n8n API key configuration in ERP settings)
  - Add email enrichment step (e.g., Hunter.io or Snov.io free tier) to fill missing emails
  - Add lead dedup by phone as fallback when email is empty
  - Add scheduled/recurring lead generation via n8n cron trigger
  - Add progress tracking UI for long-running scraping jobs
- **Security**: Auth cookie and CSRF token are passed via webhook payload; consider adding API key auth for the upsert endpoint as an alternative for automation
