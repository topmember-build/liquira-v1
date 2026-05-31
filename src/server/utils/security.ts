import { CONFIGURATION } from "@/backend/config/environment";

const rateLimitBuckets = new Map<string, { count: number; windowStartsAt: number }>();

export function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": CONFIGURATION.CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return request.headers.get("host") ?? "unknown";
}

export function isRateLimited(key: string, maxRequests: number, windowMs: number): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStartsAt >= windowMs) {
    rateLimitBuckets.set(key, { count: 1, windowStartsAt: now });
    return { limited: false };
  }

  if (bucket.count >= maxRequests) {
    const retryAfter = Math.ceil((bucket.windowStartsAt + windowMs - now) / 1000);
    return { limited: true, retryAfter };
  }

  bucket.count += 1;
  return { limited: false };
}

export function enforceRateLimit(request: Request, maxRequests: number, windowMs: number): { limited: boolean; retryAfter?: number } {
  const key = getRateLimitKey(request);
  return isRateLimited(`${request.method}:${key}`, maxRequests, windowMs);
}
