# EvenTime Cloudflare Edge Worker WAF & Rate Limiter

This Edge Worker acts as an enterprise-grade API Reverse Proxy and Web Application Firewall (WAF) in front of the Supabase PostgreSQL / PostgREST backend.

---

## Capabilities

1. **IP & User Sliding-Window Rate Limiting**:
   - **Public Read (`GET /rest/v1/events`)**: 60 requests/min per IP.
   - **Event Creation (`POST /rest/v1/events`)**: 5 events/10 min per IP/User to block spam floods.
   - **General Requests**: 120 req/min limit.
   - Sends standard RFC rate limit headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

2. **Automated Scraper & Bot Challenging**:
   - Inspects incoming `User-Agent` and blocks known scrapers (Selenium, Puppeteer, Scrapy, curl, python-requests) that query endpoints without authentic platform API headers.

3. **Enterprise Edge Security Headers**:
   - Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict CORS preflight responses.

---

## Deployment (1-Command Deploy)

From the project root:
```bash
cd cloudflare-waf-worker
npx wrangler deploy
```

Once deployed, set your custom domain route (e.g. `api.eventime.thesurfboard.in/*`) in your Cloudflare dashboard to route all mobile and web traffic through this edge guard before reaching Supabase.
