# Product Requirements Document

**Project Codename:** **RetailRadar** – StockX "Below-Retail" Price Extractor  
**Prepared for:** Ricardo Domene  
**Date:** 24 June 2025

---

## 1 – Purpose & Vision

Provide developers and growth teams with a lightweight **TypeScript-first micro-service** that returns structured JSON for all Supreme products currently priced *below* their retail price on StockX. The service will support additional brands later, but Supreme is the MVP.

---

## 2 – Background & Research Summary

| Option                                  | What We Found                                                                                                                                                                                                                                                                  | Pros                                                               | Cons                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Official StockX Public API**          | Catalog & market endpoints available after applying for a dev key on developer.stockx.com. Returns lowest ask, retail price, and product metadata. ([developer.stockx.com][1], [developer.stockx.com][2])                                                                      | • Stable<br>• No scraping ethics issues                            | • Account review can take ≥ 2 weeks<br>• Limited rate (250 req/day)<br>• Only approved seller categories |
| **RapidAPI Aggregators**                | Several third-party proxies expose StockX data (e.g. "stockx1", "stockx-api", "sneaker-database-stockx"). ([rapidapi.com][3], [rapidapi.com][4])                                                                                                                               | • Instant key<br>• Handles Cloudflare for you                      | • Paid per-call, sometimes rate-limited<br>• Data freshness varies<br>• Violates StockX ToS (risk)       |
| **DIY Scraping (Puppeteer/Playwright)** | StockX listings load via a GraphQL/XHR JSON call once the brand page renders. StockX is fronted by Cloudflare Turnstile. Cloudflare can be bypassed with `puppeteer-extra-plugin-stealth` + proxy + captcha solver (2Captcha/CapSolver). ([zenrows.com][5], [scrapeops.io][6]) | • Zero external fees<br>• Full control, extend to any brand/filter | • Must maintain anti-bot counter-measures<br>• Higher infrastructure cost                                |

**Recommendation for MVP:**

1. **Use the official API** if access is granted in time.
2. Otherwise fall back to the **RapidAPI "stockx-api"** (fastest path).
3. Keep a **Puppeteer fallback** module ready for edges cases & future scale.

---

## 3 – Goals & Success Metrics

| Goal                                                | KPI                                               |
| --------------------------------------------------- | ------------------------------------------------- |
| Deliver JSON feed for Supreme "below retail" offers | 100 % of products returned in ≤ 5 s               |
| Keep data fresh                                     | Sync job runs every 30 min; prices ≤ 30 min old   |
| Fault-tolerance                                     | 99 % successful fetches per day                   |
| Cost ceiling                                        | ≤ \$20 / month infra + API fees for 10 k requests |

---

## 4 – In / Out of Scope

**In:**

* Supreme brand endpoint
* Single GET route `/v1/supreme-below-retail`
* JSON schema (see §7)
* Simple CLI for one-off exports

**Out:**

* Historical price charts
* Authenticated user flows
* Notification system (v2)

---

## 5 – User Stories

1. *As a growth analyst*, I want an endpoint that returns all Supreme items priced below retail so I can tweet daily bargains.
2. *As a data engineer*, I need the service to run on a cron so it feeds my warehouse automatically.
3. *As a developer*, I prefer TypeScript so I can share utils with my Node backend.

---

## 6 – Functional Requirements

| #   | Requirement                                                                           |
| --- | ------------------------------------------------------------------------------------- |
| F-1 | Accept brand slug (`supreme`) and return only items where `lowestAsk < retailPrice`.  |
| F-2 | Compute `belowRetailPercent = 1 – (lowestAsk / retailPrice)` rounded to two decimals. |
| F-3 | Output sorted descending by `belowRetailPercent`.                                     |
| F-4 | Support `limit` and `cursor` query params for pagination.                             |
| F-5 | Expose health-check route `/healthz`.                                                 |
| F-6 | Retry 3× with exponential back-off on 5xx from StockX/API.                            |

---

## 7 – Data Model (JSON)

```json
{
  "brand": "Supreme",
  "name": "Supreme Nike NBA Wristbands (Pack Of 2) Black",
  "colorway": "Black",
  "retail_price": 30,
  "current_price": 22,
  "below_retail_percent": 0.2667,
  "product_url": "https://stockx.com/supreme-nike-nba-wristbands-red",
  "last_updated": "2025-06-24T14:32:18Z"
}
```

---

## 8 – Non-Functional Requirements

* **Language:** TypeScript (ES 2022), Node 20
* **Runtime:** Docker-ised container (< 200 MB)
* **Hosting:** AWS Lambda or Fly.io
* **Security:** No API keys hard-coded; pulled from Secrets Manager
* **Logging:** JSON logs via Pino → CloudWatch
* **Observability:** 90-th percentile latency alert at 4 s

---

## 9 – Technical Approach

### 9.1 Module Layout

```
src/
├── adapters/
│   ├── stockxOfficial.ts      // Official REST client
│   ├── stockxRapid.ts         // RapidAPI fallback
│   └── stockxScraper.ts       // Puppeteer fallback
├── services/
│   └── supremeService.ts
├── api/
│   └── handler.ts
└── utils/
    └── priceMath.ts
```

### 9.2 Official API Flow

1. **GET** `/catalog?query=supreme&limit=250` → returns product IDs.
2. For each ID, **GET** `/catalog/{id}` to retrieve `retailPrice` & `market.lowestAsk`.
3. Filter & map to schema above.

### 9.3 RapidAPI Flow

* One call: `https://stockx-api.p.rapidapi.com/products` with `search=supreme` + `limit`.
* Response already includes `lowestAsk` & `retailPrice`.

### 9.4 Scraping Flow (Puppeteer)

1. Launch Chromium with `puppeteer-extra` + `stealth`.
2. Set rotating residential proxy & realistic UA.
3. Navigate to brand URL with `below-retail=true`.
4. Intercept the background XHR (`/api/browse`) and parse JSON payload.
5. Detect Cloudflare challenge — if present, hand off to `puppeteer-extra-plugin-recaptcha` with 2Captcha solver token.
6. Cache resulting `cf_clearance` cookie for subsequent pages.

---

## 10 – Captcha & Anti-Bot Mitigation

| Technique                        | Notes                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| `puppeteer-extra-plugin-stealth` | masks headless fingerprints. ([scrapeops.io][6])              |
| Proxy rotation (Geo = US)        | lowers rate of Turnstile triggers.                            |
| 2Captcha / CapSolver             | Auto-solve Turnstile if challenge appears. ([zenrows.com][5]) |
| Circuit-breaker                  | After 5 failures, pause scraping 15 min.                      |

---

## 11 – Architecture (Text Overview)

Client → **API Gateway** → **Lambda/Service**
        ↘︎ chooses adapter → **Official API**
        ↘︎ fallback → **RapidAPI Proxy**
        ↘︎ last resort → **Puppeteer Micro VM**
Results cached 30 min in Redis → returned to client as JSON.

---

## 12 – Milestones & Timeline (Ideal)

| Date         | Deliverable                           |
| ------------ | ------------------------------------- |
| **T + 0 d**  | Final PRD sign-off                    |
| **T + 3 d**  | Proof of concept adapter (RapidAPI)   |
| **T + 7 d**  | Official API integration & unit tests |
| **T + 10 d** | Puppeteer fallback, captcha solver    |
| **T + 12 d** | End-to-end tests, autoscaling infra   |
| **T + 14 d** | Production deploy & docs              |

---

## 13 – Risks & Mitigations

| Risk                           | Impact        | Mitigation                                    |
| ------------------------------ | ------------- | --------------------------------------------- |
| StockX revokes API key         | Service down  | Keep RapidAPI + scraper ready                 |
| Cloudflare updates challenge   | Scraper fails | Monitor error rates, update plugins           |
| Legal / ToS violations         | Account ban   | Prefer official API; limit scraping frequency |
| Product page structure changes | Parse error   | Add schema contract tests                     |

---

## 14 – Open Questions

1. Do we need historical price snapshots (requires DB)?
2. What is the acceptable paid tier limit on RapidAPI?
3. Is Supreme the only brand for phase 1, or do we add *Nike SB* next?

---

### Next Steps

* Confirm API-access preference (official vs RapidAPI vs scraper).
* Approve timeline & allocate proxy/Captcha budget.
* Kick-off sprint 0 (repo skeleton, CI/CD).

[1]: https://developer.stockx.com/?utm_source=chatgpt.com "StockX Developer Portal"
[2]: https://developer.stockx.com/portal/api-introduction/?utm_source=chatgpt.com "API Introduction - StockX Developer Portal"
[3]: https://rapidapi.com/veilleio-veilleio-default/api/stockx1?utm_source=chatgpt.com "StockX - Rapid API"
[4]: https://rapidapi.com/vlourme-GvmH6N2UW/api/stockx-api?utm_source=chatgpt.com "StockX API - Rapid API"
[5]: https://www.zenrows.com/blog/puppeteer-cloudflare-bypass?utm_source=chatgpt.com "How to Bypass Cloudflare With Puppeteer: 2 Working Methods"
[6]: https://scrapeops.io/puppeteer-web-scraping-playbook/nodejs-puppeteer-bypass-cloudflare/?utm_source=chatgpt.com "How To Bypass Cloudflare with Puppeteer - ScrapeOps"