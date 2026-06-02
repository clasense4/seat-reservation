# Production Roadmap

This document outlines the steps required to evolve the current MVP into a production-grade system. Each section addresses a specific gap identified in the [architecture-and-trade-offs.md](./architecture-and-trade-offs.md) and [non-goals.md](./non-goals.md) documents.

---

## Phase 1: Authentication Provider

**Current state:** Session-based auth with Redis-stored sessions, simple password hashing via Bun, and a "remember me" checkbox (90-day TTL).

**Production target:** Federated identity via a dedicated IdP.

### Options

| Provider | Type | Notes |
|---|---|---|
| **Amazon Cognito** | Managed (AWS) | Native integration with ALB/API Gateway. Supports social login, MFA, and user pools. |
| **Okta** | SaaS | Feature-rich. Supports SSO, SCIM provisioning, adaptive MFA. Higher cost at scale. |
| **Keycloak** | Self-hosted | Open-source. Full control but adds operational overhead (clustering, DB). |

### Migration steps

1. Replace `src/auth.tsx` session logic with OAuth 2.0 / OIDC flow — the IdP issues JWTs instead of Redis session IDs.
2. Add JWT validation middleware (public key caching, expiry checks).
3. Remove Redis-backed session storage (`session:*` keys), or keep it for short-lived refresh tokens.
4. Update view templates — login/register pages redirect to the IdP's hosted UI.

### Trade-offs

| Aspect | Current (MVP) | Production (IdP) |
|---|---|---|
| **Complexity** | Minimal — 1 file, Redis-only | New dependency, OAuth flow, token refresh |
| **Security** | Basic password hash, httpOnly cookie | MFA, SSO, brute-force protection built-in |
| **User experience** | Custom form | Redirect to IdP, possible context switch |
| **Operational cost** | Zero (Redis already running) | Cognito: ~$0/MAU for first 50k; Okta: per-user licensing; Keycloak: infrastructure cost |

---

## Phase 2: Payment Provider

**Current state:** Mock payment — only `4242 4242 4242 4242` succeeds; any other card fails. No real charges or receipts.

**Production target:** Stripe integration with real payment processing, webhook handling, and refund support.

### Integration steps

1. **Checkout session** — POST to Stripe Checkout API from `/payment` handler; return a redirect to the Stripe-hosted payment page.
2. **Webhook endpoint** — Add `POST /stripe/webhook` to receive `checkout.session.completed` events. Verify signatures with the Stripe secret.
3. **Idempotency** — Use Stripe idempotency keys to prevent duplicate reservation creation from retried webhooks.
4. **Payment intent fallback** — For embedded UIs, switch to Stripe Elements / Payment Intents API (requires client-side JS, deviates from pure HTMX approach).

### Database changes

- Add `payment_provider` and `payment_id` columns to the `reservations` table.
- Store Stripe `payment_intent_id` or `checkout_session_id` for reconciliation.

### Trade-offs

| Aspect | Current (MVP) | Production (Stripe) |
|---|---|---|
| **Hold lifecycle** | Hold released immediately on mock "fail" | Hold transitions to `awaiting_payment`; released only after webhook timeout |
| **Failure handling** | Immediate redirect | Webhook timeout + reconciliation job |
| **Frontend** | Pure HTMX form | Stripe Checkout redirect (no frontend change) or Stripe Elements (requires JS) |
| **PCI scope** | None (no real card data) | Out of scope — Stripe handles PCI compliance |

---

## Phase 3: Production Hosting (AWS)

**Current state:** Docker Compose on a single machine (local or VM). All three services (app, PostgreSQL, Redis) co-located.

**Production target:** Horizontally scalable, resilient infrastructure on AWS.

### Option A: EC2 + ALB (simpler, more control)

```
Cloudflare
    |
  ALB (SSL termination)
    |
  +-- EC2 (app, auto-scaling group)
  +-- EC2 (app)
  +-- EC2 (app)
    |
  +-- RDS (PostgreSQL, Multi-AZ)
  +-- ElastiCache (Redis, Cluster Mode)
```

### Option B: ECS / EKS (container-native)

```
Cloudflare
    |
  ALB (SSL termination)
    |
  ECS Service (Fargate)  or  EKS (K8s)
    |
  +-- Task/Pod (app)
  +-- Task/Pod (app)
  +-- Task/Pod (app)
    |
  +-- RDS (PostgreSQL, Multi-AZ)
  +-- ElastiCache (Redis, Cluster Mode)
```

### Component breakdown

| Component | Current (MVP) | Production (AWS) |
|---|---|---|
| **Application** | Bun process in Docker | ECS Fargate task or EKS pod. |
| **Database** | PostgreSQL container | **RDS PostgreSQL Multi-AZ** — automated backups, point-in-time recovery, failover. |
| **Cache** | Redis container | **ElastiCache for Redis** — Cluster Mode for sharding, Multi-AZ for failover. The Lua hold scripts remain unchanged. |
| **Session** | Redis `session:*` keys | Same Redis cluster or switch to JWT (see Phase 1). |
| **Secrets** | `.env` file | **AWS Secrets Manager** or **Parameter Store** — DATABASE_URL, REDIS_URL, Stripe keys, Cognito client secret. |
| **Logging** | `console.log` | **CloudWatch Logs** — structured JSON logging, metric filters for error alerts. |
| **CI/CD** | Manual | **CodePipeline** or **GitHub Actions** — build Docker image, push to ECR, deploy to ECS/EKS. |

### Scaling considerations

| Resource | Strategy |
|---|---|
| **App tier** | Horizontal — target CPU/memory tracking via ALB. Stateless design (sessions in Redis) enables easy scale-out. |
| **PostgreSQL** | Vertical first (larger instance), then read replicas for reporting queries. Write master remains single. |
| **Redis** | ElastiCache Cluster Mode — shard hold keys (`hold:<seatId>`) across nodes. Lua scripts operate on a single shard (keys are passed as arguments). |

### Trade-offs

| Aspect | Current (MVP) | Production (AWS) |
|---|---|---|
| **Startup time** | < 1 minute (docker compose up) | 15-30 minutes (first deployment) |
| **Cost** | Free (local machine) | ~$100-500/month (small production setup) |
| **Operational knowledge** | Docker basics | VPC, subnets, IAM, security groups, ALB target groups, auto-scaling |
| **Resilience** | Single point of failure (one machine) | Multi-AZ, auto-healing, automated failover |

### Network Architecture

A production VPC design uses public and private subnets across multiple Availability Zones (AZs) to minimize the attack surface.

```
                   Cloudflare
                       |
                   Internet Gateway
                       |
              +------ ALB ------+
              |   (Public Subnets, AZ-a + AZ-b)
              |                  |
        +-----+-----+      +----+------+
        | App EC2    |      | App EC2   |  <-- Private Subnets
        | (app-a)    |      | (app-b)   |
        +-----+------+      +-----+-----+
              |                    |
        +-----+------+      +----+------+
        | RDS (w)    |------| RDS (r)   |  <-- Private Subnets (Multi-AZ)
        +-----+------+      +-----------+
              |
        +-----+------+
        | ElastiCache |  <-- Private Subnets
        | (Redis)     |
        +-------------+
              |
        +-----+------+
        | NAT Gateway |  <-- Public Subnet (for outbound traffic)
        +-------------+
```

| Layer | Subnet type | Accessibility |
|---|---|---|
| **Internet Gateway** | Public (attached to VPC) | Inbound from internet |
| **ALB** | Public | Accepts traffic from Cloudflare, terminates TLS |
| **App instances** | Private | Only reachable via ALB. No public IPs assigned. |
| **RDS (PostgreSQL)** | Private | Only reachable from app security group. No public access. |
| **ElastiCache (Redis)** | Private | Only reachable from app security group. No public access. |
| **NAT Gateway** | Public | Enables outbound internet for private subnets (e.g., Stripe API calls, OS updates) |

#### Security group rules

| Source → Target | Protocol | Port | Purpose |
|---|---|---|---|
| Cloudflare IPs → ALB | HTTPS | 443 | User traffic |
| ALB → App instances | HTTP | 3000 | Internal routing |
| App instances → RDS | PostgreSQL | 5432 | Database queries |
| App instances → ElastiCache | Redis | 6379 | Session + hold data |
| App instances → NAT Gateway | Any | Any | Outbound (Stripe, Cognito, etc.) |

#### NAT Gateway cost breakdown

Private subnets cannot reach the internet directly. Any outbound traffic (Stripe API calls, Cognito token exchange, OS package updates) must route through a NAT device.

| Component | Cost (us-east-1, approx) |
|---|---|
| **NAT Gateway** (per hour) | ~$0.045/hr × 730h = **$32.85/month** |
| **Data processed** (per GB) | ~$0.045/GB |
| **Single-AZ** | 1 NAT Gateway = ~$33/month |
| **Multi-AZ** | 1 NAT Gateway per AZ = ~$66/month (for 2 AZs) |

> **Alternative — NAT Instance:** Replace the managed NAT Gateway with a self-managed EC2 NAT Instance (Amazon Linux AMI). This reduces cost to the EC2 instance price (e.g., t3.nano ~$5/month) but adds operational burden: you must manage failover, auto-scaling, and instance health yourself. Suitable for development/staging but not recommended for production due to single-point-of-failure risk.

#### Data transfer costs

Data moving between AWS services incurs charges. Understanding these costs is essential for capacity planning.

| Path | Cost (us-east-1) | Notes |
|---|---|---|
| **Internet In** (Cloudflare → ALB) | **Free** | AWS does not charge for inbound data transfer |
| **Internet Out** (ALB → User) | ~$0.09/GB (first 10 TB/month) | Egress to internet. Cloudflare sits in front, but origin responses still count as egress from AWS |
| **Cross-AZ — ALB to App** | ~$0.01/GB each direction | Traffic between AZs within the same VPC |
| **Cross-AZ — App to RDS** | ~$0.01/GB each direction | Multi-AZ RDS replicates synchronously across AZs |
| **Cross-AZ — App to ElastiCache** | ~$0.01/GB each direction | Read/write operations across AZs |
| **NAT Gateway data processing** | ~$0.045/GB | Applies to outbound traffic routed through NAT |
| **HTMX polling overhead** | Varies | Each `/seats/partial` poll is ~1-2 KB. With 10,000 concurrent users polling every 3 seconds: ~3,333 requests/sec × 2 KB × 30 days ≈ **~17 TB/month** egress. Consider increasing polling interval or adding CDN caching for static portions. |

> **Key takeaway:** Cross-AZ data transfer and HTMX polling egress are the largest hidden costs. To minimize them:
> - Co-locate app instances, RDS, and ElastiCache within the same AZ when possible (reduces cross-AZ traffic). Multi-AZ is for failover, not active-active distribution.
> - Increase HTMX polling interval from 3s to 5-10s in production.
> - Use Cloudflare caching for the seat-map HTML when seats are not held (short TTL cache).

> **Reference implementation:** See [Terraform VPC Introduction](https://aku.dev/terraform-vpc-introduction/) for guide creating VPC using Infrastructure as Code.

---

## Phase 4: Cloudflare — DDoS & Login Protection

**Current state:** No DDoS protection. Login endpoint is directly exposed — vulnerable to brute-force and credential stuffing.

**Production target:** Cloudflare in front of all traffic.

### Deployment

```
Browser
    |
  Cloudflare (CDN + WAF + Rate Limiting)
    |
  ALB (origin)
    |
  App instances
```

### Configuration

| Feature | Purpose |
|---|---|
| **CDN / Caching** | Cache static assets (CSS, HTMX script). Dynamic seat-map responses bypass cache. |
| **WAF (Web Application Firewall)** | Block SQL injection, XSS, known attack patterns. Custom rule to block non-browser User-Agents on the `/login` endpoint. |
| **Rate Limiting** | Per-IP rate limit on `POST /login` (e.g., 5 attempts / minute). Prevent credential stuffing without blocking legitimate users. |
| **DDoS Protection** | Layer 3/4/7 DDoS mitigation included with Cloudflare's anycast network. |
| **Managed Challenge** | Present JS/captcha challenge for suspicious requests before they reach the application. |
| **SSL / TLS** | Free SSL termination at the edge. Origin pull certificate between Cloudflare and ALB. |
| **Bot Management** (add-on) | Detect and block automated seat-reservation bots. |

### Impact on architecture

| Area | Change required |
|---|---|
| **DNS** | Point `seat-reservation.example.com` to Cloudflare nameservers. |
| **ALB** | Restrict inbound traffic to Cloudflare IP ranges only (published [here](https://www.cloudflare.com/ips/)). |
| **Session storage** | Cloudflare does not store sessions. Existing Redis sessions are unaffected. |
| **HTMX polling** | Polling (`/seats/partial`) bypasses the cache — origin always serves fresh responses. Cloudflare handles this correctly via `Cache-Control: no-cache` headers. |

### Rate limiting for hold endpoints

In addition to login protection, apply rate limiting to `POST /seats/:id/hold` and `POST /seats/:id/release`:

```
# Cloudflare Rate Limiting Rule
URL: /seats/*/hold, /seats/*/release
Threshold: 10 requests / 10 seconds per IP
Action: Block for 60 seconds
```

This prevents a single malicious client from rapidly holding and releasing seats to disrupt availability.

---

## Summary: Phased Migration

| Phase | Effort | Risk | Value |
|---|---|---|---|
| **1. Auth Provider** | Medium | Low | High — security baseline |
| **2. Stripe** | Medium | Medium | High — real payments |
| **3. AWS Hosting** | High | Medium | High — scalability, reliability |
| **4. Cloudflare** | Low | Low | High — security, DDoS protection |

### Recommended order

```
Phase 4 (Cloudflare)     → Quick win, protects everything
Phase 1 (Auth Provider)  → Security foundation
Phase 3 (AWS Hosting)    → Scalability + reliability
Phase 2 (Stripe)         → Real payments after infrastructure is stable
```

Cloudflare first because it's the fastest to set up and immediately protects all endpoints. Auth provider next to establish identity security. AWS hosting provides the reliable foundation needed before handling real payments in the final phase.

---

## References

- [Architecture & Trade-offs](./architecture-and-trade-offs.md) — current design decisions that inform these migration paths
- [UX Narrative](./ux-narrative.md) — end-to-end user flow that must remain intact after migration
- [Non-Goals & Known Limitations](./non-goals.md) — features intentionally excluded from the MVP that this roadmap addresses
