# Production Environment Troubleshooting Guide

## Your Current Issue

### Error Message
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service is under maintenance. Please try again later",
    "details": {
      "reason": "rate_limiter_backend_unavailable"
    }
  },
  "timestamp": "2026-05-04T09:01:10+07:00",
  "request_id": "05731b29-879f-40cb-86e5-21125bc1ecdd"
}
```

### Root Cause Analysis

**🔴 CRITICAL: Redis Connection Failure**

Your production `.env` has:
```env
REDIS_HOST=localhost
REDIS_PORT=6380
```

**Why it fails in production but works in development:**

| Environment | Status | Reason |
|---|---|---|
| **Development** | ✅ Works | App and Redis both on localhost |
| **Production** | ❌ Fails | App server (e.g., 1.2.3.4) tries to connect to localhost (127.0.0.1) on VPS |

When your app server is on a different VPS from Redis:
- `REDIS_HOST=localhost` = `127.0.0.1`
- App server cannot reach itself via localhost
- Rate limiter middleware fails to connect to Redis
- All requests return `SERVICE_UNAVAILABLE`

### How Rate Limiter Works

```go
// From: apps/api/internal/core/middleware/rate_limit.go

// Step 1: Try Redis connection
res, err := client.Eval(ctx, redisFixedWindowLua, []string{key}, window).Result()

// Step 2: If Redis fails and FailClosedOnRedisError=true (production):
if err != nil {
    return false, 0, 0, err  // ← Returns error → SERVICE_UNAVAILABLE
}

// Step 3: Fallback to in-memory limiter only if error is gracefully handled
// But if FailClosedOnRedisError=true, it rejects the request immediately
```

## Fixes Required

### 1. ✅ Fix REDIS_HOST (IMMEDIATE)

**Current (❌ Wrong):**
```env
REDIS_HOST=localhost
REDIS_PORT=6380
```

**Fix (✅ Correct):**
```env
# If Redis is on a different server
REDIS_HOST=redis.yourserver.com    # OR the actual IP: 5.6.7.8
REDIS_PORT=6379                    # Standard Redis port, NOT 6380

# If Redis is on the same server
REDIS_HOST=127.0.0.1              # localhost is OK if same server only
REDIS_PORT=6379
```

### 2. 📋 Verify Redis Accessibility

Run these commands **from your app server**:

```bash
# Test basic connectivity
redis-cli -h <REDIS_HOST> -p <REDIS_PORT> ping
# Expected output: PONG

# If password required
redis-cli -h <REDIS_HOST> -p <REDIS_PORT> -a <PASSWORD> ping

# Test from your app server specifically
ssh user@app-server
redis-cli -h 5.6.7.8 -p 6379 ping
```

### 3. 📊 Fix Port Number

You have `REDIS_PORT=6380` - the standard is `6379`:
- If using standard Redis: change to `6379`
- If intentionally using `6380`: verify Redis actually listens on that port

```bash
# Check what port Redis is listening on
redis-cli -h <REDIS_HOST> -p <YOUR_PORT> info server
```

### 4. 🔐 Setup Sentry for Observability (RECOMMENDED)

Currently **no error tracking** is configured. Add:

```env
# .env.production
PPROF_ENABLED=true
PPROF_TOKEN=your-secret-token
METRICS_ENABLED=true
METRICS_TOKEN=your-secret-token
```

Then implement in your Go code (if not already):

```go
// internal/core/infrastructure/sentry/sentry.go
import "github.com/getsentry/sentry-go"

func InitSentry(dsn string) error {
    return sentry.Init(sentry.ClientOptions{
        Dsn: dsn,
        Environment: os.Getenv("APP_ENV"),
        TracesSampleRate: 1.0,
    })
}
```

## Environment Variables Analysis

### Currently Used by Application

✅ **Server Configuration (8 vars)**
- `APP_ENV` / `ENV`
- `PORT`
- `APP_TIMEZONE`
- `FRONTEND_BASE_URL`
- `ROOT_DOMAIN`
- `SERVER_*` (timeouts, max sizes)

✅ **Database (9 vars)**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSLMODE`
- `DB_MAX_OPEN_CONNS`, `DB_MAX_IDLE_CONNS`
- `DB_CONN_MAX_LIFETIME_MINUTES`, `DB_CONN_MAX_IDLE_TIME_MINUTES`

✅ **Redis (9 vars - **CRITICAL FOR YOUR ISSUE**)
- `REDIS_HOST` ← **Your main problem**
- `REDIS_PORT` ← **Wrong port (6380 instead of 6379)**
- `REDIS_PASSWORD`
- `REDIS_DB`
- `REDIS_DIAL_TIMEOUT_SEC`
- `REDIS_READ_TIMEOUT_SEC`
- `REDIS_WRITE_TIMEOUT_SEC`
- `REDIS_POOL_SIZE`
- `REDIS_MIN_IDLE_CONNS`

✅ **JWT (9 vars)**
- `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_KEYS`, `JWT_REFRESH_KEYS`
- `JWT_ACCESS_KID`, `JWT_REFRESH_KID`
- `JWT_ISSUER`
- `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`

✅ **Rate Limiting (11 vars)**
- `RATE_LIMIT_LOGIN_REQUESTS`, `RATE_LIMIT_LOGIN_WINDOW`
- `RATE_LIMIT_REFRESH_REQUESTS`, `RATE_LIMIT_REFRESH_WINDOW`
- `RATE_LIMIT_UPLOAD_REQUESTS`, `RATE_LIMIT_UPLOAD_WINDOW`
- `RATE_LIMIT_GENERAL_REQUESTS`, `RATE_LIMIT_GENERAL_WINDOW`
- `RATE_LIMIT_PUBLIC_REQUESTS`, `RATE_LIMIT_PUBLIC_WINDOW`
- `RATE_LIMIT_FAIL_CLOSED_ON_REDIS_ERROR`
- `RATE_LIMIT_LOGIN_BY_EMAIL_REQUESTS`, `RATE_LIMIT_LOGIN_BY_EMAIL_WINDOW`
- `RATE_LIMIT_LOGIN_GLOBAL_REQUESTS`, `RATE_LIMIT_LOGIN_GLOBAL_WINDOW`

✅ **Other (13 vars)**
- `CSRF_ENABLED`
- `PROXY_HEADERS_ENABLED`, `TRUSTED_PROXIES`
- `XENDIT_CREDENTIAL_ENCRYPTION_KEY`
- `CEREBRAS_BASE_URL`, `CEREBRAS_API_KEY`, `CEREBRAS_MODEL`
- `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`, `XENDIT_BASE_URL`
- `STORAGE_UPLOAD_DIR`, `STORAGE_BASE_URL`, `STORAGE_MAX_UPLOAD_SIZE`
- `HSTS_MAX_AGE`, `HSTS_INCLUDE_SUBDOMAINS`, `HSTS_PRELOAD`
- `PPROF_ENABLED`, `PPROF_TOKEN`
- `METRICS_ENABLED`, `METRICS_TOKEN`
- `SUBSCRIPTION_GRACE_PERIOD_DAYS`

✅ **Seeder Configuration (5 vars)**
- `RUN_MIGRATIONS`
- `RUN_SEEDERS`
- `SEED_DEFAULT_EMAIL`
- `SEED_DEFAULT_PASSWORD`
- `SEED_CLEANUP_DATABASE`, `SEED_ONLY_MASTER_DATA`

### ❌ Unused Environment Variables

These were in `.env.production.example` but **NOT used by the application:**
- `MIGRATE_ONCE` - Not in code
- `SEED_ONCE` - Not in code
- `SEED_MINIMAL_DATA` - Commented out in seeders
- `N8N_LEADS_WEBHOOK_URL` - Not in code
- `REDIS_TLS` - Not in config
- `STORAGE_TYPE` - Not in config (assumed local or S3 elsewhere)
- `STORAGE_S3_*` - Not in config
- `CORS_ALLOWED_ORIGINS` - Not in config
- `CORS_ALLOW_CREDENTIALS` - Not in config
- `RATE_LIMIT_ENABLED` - Always on if Redis works
- `RATE_LIMIT_REQUESTS_PER_MINUTE` - Not in config
- `RATE_LIMIT_BURST` - Not in config
- `LOG_LEVEL` - Not in config
- `LOG_FORMAT` - Not in config
- `SENTRY_DSN` - Not in code (recommend adding)
- `DATADOG_*` - Not in config
- `SECURITY_HSTS_ENABLED` - HSTS always enabled
- `SECURITY_CSP_ENABLED` - Not in code
- `SMTP_*` - Not in config
- `HEALTH_CHECK_ENABLED` - Not in config
- `HEALTH_CHECK_PATH` - Not in config
- `SHUTDOWN_TIMEOUT` - Use `SERVER_SHUTDOWN_TIMEOUT_SEC`
- `FEATURE_*` - All feature flags not in config
- `DATA_RETENTION_DAYS` - Not in code
- `AUDIT_LOG_RETENTION_DAYS` - Not in code
- `PII_ENCRYPTION_ENABLED` - Not in code
- `DB_CONN_MAX_LIFETIME` - Use `DB_CONN_MAX_LIFETIME_MINUTES`

## Production Deployment Checklist

### 🚨 Critical (Must fix before going live)
- [ ] **REDIS_HOST** points to actual Redis server (not localhost)
- [ ] **REDIS_PORT** is correct (usually 6379)
- [ ] Redis is accessible from app server: `redis-cli -h REDIS_HOST -p REDIS_PORT ping`
- [ ] All `CHANGE_ME` secrets replaced with real values
- [ ] Database SSL enabled: `DB_SSLMODE=require`
- [ ] JWT_SECRET is strong (min 64 chars, cryptographically random)
- [ ] `APP_ENV=production` set
- [ ] `RUN_MIGRATIONS=false` and `RUN_SEEDERS=false`

### ⚠️ Important (Should be configured)
- [ ] `PPROF_ENABLED=true` for performance monitoring
- [ ] `METRICS_ENABLED=true` for metrics collection
- [ ] Database backup strategy configured
- [ ] Redis backup strategy configured
- [ ] Rate limiting tuned for your traffic patterns
- [ ] `FRONTEND_BASE_URL` correctly set
- [ ] `ROOT_DOMAIN` set for cookie sharing (if needed)

### 📊 Monitoring
- [ ] Error tracking setup (implement Sentry integration)
- [ ] Performance monitoring active
- [ ] Rate limiter metrics tracked
- [ ] Redis connection pool health monitored

## Testing Steps

### Step 1: Verify Redis Connection
```bash
# From app server
redis-cli -h <REDIS_HOST> -p <REDIS_PORT> -a <PASSWORD> ping
# Should return: PONG
```

### Step 2: Update Environment Variables
```env
REDIS_HOST=<actual-redis-ip-or-hostname>
REDIS_PORT=6379
```

### Step 3: Restart Application
```bash
systemctl restart gims-api
# or docker restart gims-api
# or whatever your deployment method is
```

### Step 4: Test Rate Limit Endpoint
```bash
# Test login endpoint (has rate limiting)
curl -X POST http://localhost:8087/sys-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'

# Should NOT return SERVICE_UNAVAILABLE if Redis is working
```

## Quick Debug Checklist

If still getting `SERVICE_UNAVAILABLE`:

1. **Check app logs:**
   ```bash
   docker logs gims-api  # or journalctl -u gims-api
   # Look for: "Failed to connect to Redis"
   ```

2. **Verify Redis is running:**
   ```bash
   redis-cli -h REDIS_HOST ping
   ```

3. **Check firewall:**
   ```bash
   telnet REDIS_HOST 6379
   # Should connect successfully
   ```

4. **Verify DNS resolution:**
   ```bash
   nslookup REDIS_HOST  # or dig REDIS_HOST
   ```

5. **Check Redis configuration:**
   ```bash
   redis-cli -h REDIS_HOST -p 6379 info server
   ```

6. **Enable debug logging** (temporarily):
   ```env
   LOG_LEVEL=debug  # If implemented
   PPROF_ENABLED=true
   ```

## References

- **Rate Limiter Implementation:** `apps/api/internal/core/middleware/rate_limit.go`
- **Config Loading:** `apps/api/internal/core/infrastructure/config/config.go`
- **Redis Setup:** `apps/api/internal/core/infrastructure/redis/redis.go`
- **.env.production.example:** Updated with only used variables

