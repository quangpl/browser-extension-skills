# Extension ↔ Backend API Patterns

## Authentication Flow

```
Extension                    Backend                      Google
   │                            │                            │
   ├─ chrome.identity ─────────────────────────────────────→ │
   │   .getAuthToken()          │                            │
   │ ←──────────────────── Google OAuth token ───────────────┤
   │                            │                            │
   ├─ POST /auth/verify ───────→│                            │
   │   { token }                ├─ verify token ────────────→│
   │                            │ ←── payload (email, sub) ──┤
   │ ←── { user, sessionToken } │                            │
   │                            │                            │
   ├─ GET /license/verify ─────→│ (uses sessionToken)        │
   │   Authorization: Bearer    ├─ check DB                  │
   │ ←── { active, plan }      │                            │
```

## Extension-Side API Client

```typescript
// services/api-client.ts
const API_BASE = "https://your-backend.com/api/v1";

async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(token);
    });
  });
}

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Usage
export const api = {
  verifyLicense: () =>
    apiCall<{ active: boolean; plan: string }>("/license/verify"),
  createCheckout: (plan: string) =>
    apiCall<{ checkoutUrl: string }>("/checkout/create", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
};
```

## License Controller (Backend)

```typescript
// license/license.controller.ts
import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { LicenseService } from "./license.service";

@Controller("license")
export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  @Get("verify")
  @UseGuards(AuthGuard)
  async verify(@Req() req) {
    const license = await this.licenseService.findActiveByUserId(req.user.sub);
    return {
      active: !!license,
      plan: license?.plan ?? "free",
      expiresAt: license?.expiresAt ?? null,
    };
  }
}
```

## Extension-Side License Check with Cache

```typescript
// services/license-service.ts
const CACHE_TTL = 3600000; // 1 hour

export async function checkLicense(): Promise<{
  active: boolean;
  plan: string;
}> {
  // Check cache
  const { licenseCache } = await chrome.storage.local.get("licenseCache");
  if (licenseCache && licenseCache.expiresAt > Date.now()) {
    return licenseCache;
  }

  // Fetch from backend
  try {
    const license = await api.verifyLicense();
    const cached = { ...license, expiresAt: Date.now() + CACHE_TTL };
    await chrome.storage.local.set({ licenseCache: cached });
    return license;
  } catch {
    // Offline grace: use cached even if expired (up to 24h)
    if (licenseCache && licenseCache.expiresAt > Date.now() - 86400000) {
      return licenseCache;
    }
    return { active: false, plan: "free" };
  }
}
```

## Manifest Permissions Required

```json
{
  "permissions": ["identity", "storage"],
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  },
  "host_permissions": ["https://your-backend.com/*"]
}
```

## Error Handling Pattern

```typescript
// Extension side: wrap all API calls
try {
  const license = await api.verifyLicense();
  updateUI(license);
} catch (error) {
  if (error.message.includes("401")) {
    // Token expired, re-authenticate
    chrome.identity.removeCachedAuthToken({ token: currentToken });
  } else {
    // Network error, show offline state
    showOfflineState();
  }
}
```
