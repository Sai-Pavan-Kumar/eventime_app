/**
 * Cloudflare Edge Worker — Enterprise WAF & Rate Limiting Reverse Proxy
 * Sits in front of the Supabase API to defend against:
 * 1. Distributed scraping & catalog harvesting.
 * 2. Rapid event creation spam & bot flood attacks.
 * 3. DDoS burst traffic on database read endpoints.
 */

export interface Env {
  UPSTREAM_SUPABASE_URL: string; // e.g. "https://pgqcdygsbafladcczubn.supabase.co"
  RATE_LIMIT_KV?: any;           // Optional Cloudflare KV for multi-datacenter distributed state
}

interface RateLimitRule {
  limit: number;     // Maximum allowed requests in window
  windowSec: number; // Time window in seconds
}

const RATE_RULES: Record<string, RateLimitRule> = {
  // Public feed queries (GET /rest/v1/events)
  READ_EVENTS: {
    limit: 60,
    windowSec: 60,
  },
  // Event creation submissions (POST /rest/v1/events)
  CREATE_EVENT: {
    limit: 5,
    windowSec: 600, // 10 minutes
  },
  // Generic fallback for all other endpoints
  DEFAULT: {
    limit: 120,
    windowSec: 60,
  },
};

// Known scraper user-agent signatures
const SUSPICIOUS_USER_AGENTS = [
  'curl/',
  'python-requests',
  'python-urllib',
  'aiohttp',
  'httpx',
  'scrapy',
  'selenium',
  'puppeteer',
  'playwright',
  'postmanruntime',
];

// In-worker sliding window tracker (Edge memory fast-path)
const edgeMemoryRateLimits = new Map<string, { count: number; expiresAt: number }>();

function getClientIdentifier(request: Request): string {
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown-ip';
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Hash or slice the token to isolate authenticated users behind corporate NATs
    return `${clientIp}_${authHeader.slice(7, 24)}`;
  }
  return clientIp;
}

function evaluateRateLimit(
  key: string,
  rule: RateLimitRule
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Math.floor(Date.now() / 1000);
  const record = edgeMemoryRateLimits.get(key);

  if (!record || now >= record.expiresAt) {
    edgeMemoryRateLimits.set(key, {
      count: 1,
      expiresAt: now + rule.windowSec,
    });
    return { allowed: true, remaining: rule.limit - 1, retryAfter: 0 };
  }

  if (record.count >= rule.limit) {
    const retryAfter = Math.max(1, record.expiresAt - now);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: rule.limit - record.count,
    retryAfter: 0,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const upstreamUrl = env.UPSTREAM_SUPABASE_URL || 'https://pgqcdygsbafladcczubn.supabase.co';

    // 1. CORS Preflight Handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Range, x-client-info',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const isSuspiciousAgent = SUSPICIOUS_USER_AGENTS.some((bot) => userAgent.includes(bot));

    // 2. Automated Scraper Detection
    if (isSuspiciousAgent && !request.headers.get('apikey')) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Direct automated scraping without platform credentials is restricted.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Match Route to Rate Limiting Rule
    let rule = RATE_RULES.DEFAULT;
    let actionKey = 'default';

    if (url.pathname.startsWith('/rest/v1/events')) {
      if (request.method === 'POST') {
        rule = RATE_RULES.CREATE_EVENT;
        actionKey = 'create_event';
      } else if (request.method === 'GET') {
        rule = RATE_RULES.READ_EVENTS;
        actionKey = 'read_events';
      }
    }

    const clientId = getClientIdentifier(request);
    const rateLimitKey = `${actionKey}:${clientId}`;
    const rateCheck = evaluateRateLimit(rateLimitKey, rule);

    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please retry after ${rateCheck.retryAfter} seconds.`,
          retry_after: rateCheck.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retryAfter),
            'X-RateLimit-Limit': String(rule.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 4. Forward Request to Supabase Upstream
    const proxyTargetUrl = `${upstreamUrl}${url.pathname}${url.search}`;
    const modifiedHeaders = new Headers(request.headers);

    // Set Host header to upstream host to satisfy cloud routing
    const upstreamHost = new URL(upstreamUrl).host;
    modifiedHeaders.set('Host', upstreamHost);

    const proxyRequest = new Request(proxyTargetUrl, {
      method: request.method,
      headers: modifiedHeaders,
      body: request.body,
      redirect: 'follow',
    });

    try {
      const response = await fetch(proxyRequest);
      const responseHeaders = new Headers(response.headers);

      // Attach Security & Rate Limit Feedback Headers
      responseHeaders.set('X-RateLimit-Limit', String(rule.limit));
      responseHeaders.set('X-RateLimit-Remaining', String(rateCheck.remaining));
      responseHeaders.set('X-Content-Type-Options', 'nosniff');
      responseHeaders.set('X-Frame-Options', 'DENY');
      responseHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: 'Gateway Error',
          message: 'Unable to reach backend database service.',
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
