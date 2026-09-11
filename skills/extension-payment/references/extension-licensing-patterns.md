# Extension Licensing Patterns

## Pattern 1: Account-Based (Recommended)

User signs in → backend checks subscription status → extension unlocks features.

**Pros**: Simplest, works across devices, easy to manage
**Cons**: Requires authentication, backend dependency

```typescript
// Extension checks license on startup
chrome.runtime.onStartup.addListener(async () => {
  const token = await chrome.identity.getAuthToken({ interactive: false });
  if (!token) return; // Not logged in

  const res = await fetch("https://api.yourapp.com/license", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { plan, features } = await res.json();
  await chrome.storage.local.set({
    license: { plan, features, checkedAt: Date.now() },
  });
});
```

**Feature gating:**

```typescript
async function hasFeature(feature: string): Promise<boolean> {
  const { license } = await chrome.storage.local.get("license");
  return license?.features?.includes(feature) ?? false;
}
```

## Pattern 2: License Key

User purchases → receives key → enters in extension options page → validated.

**Pros**: No authentication required, works offline after validation
**Cons**: Keys can be shared, harder to manage

```typescript
async function validateKey(key: string): Promise<boolean> {
  const res = await fetch("https://api.yourapp.com/validate-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, extensionId: chrome.runtime.id }),
  });
  const { valid, expiresAt } = await res.json();
  if (valid) {
    await chrome.storage.local.set({ licenseKey: key, expiresAt });
  }
  return valid;
}
```

**Anti-piracy**: Bind key to extension ID + device fingerprint. Limit activations per key.

## Pattern 3: Freemium with Usage Limits

Free tier has limited usage → premium unlocks unlimited.

```typescript
const DAILY_FREE_LIMIT = 10;

async function canUseFeature(): Promise<boolean> {
  const { license, usageToday } = await chrome.storage.local.get([
    "license",
    "usageToday",
  ]);
  if (license?.plan === "premium") return true;

  const today = new Date().toDateString();
  const usage = usageToday?.date === today ? usageToday.count : 0;
  return usage < DAILY_FREE_LIMIT;
}

async function trackUsage() {
  const today = new Date().toDateString();
  const { usageToday } = await chrome.storage.local.get("usageToday");
  const count = usageToday?.date === today ? usageToday.count + 1 : 1;
  await chrome.storage.local.set({ usageToday: { date: today, count } });
}
```

## Pattern 4: Trial Period

Full access for N days → then require payment.

```typescript
const TRIAL_DAYS = 7;

async function isTrialActive(): Promise<boolean> {
  const { installDate } = await chrome.storage.local.get("installDate");
  if (!installDate) {
    await chrome.storage.local.set({ installDate: Date.now() });
    return true;
  }
  const daysSinceInstall = (Date.now() - installDate) / (1000 * 60 * 60 * 24);
  return daysSinceInstall <= TRIAL_DAYS;
}
```

## Upgrade Prompt UI

Show in popup/options when free user hits limit:

```typescript
function showUpgradePrompt(reason: string) {
  const upgradeUrl = "https://yourapp.com/pricing"; // Or provider checkout URL
  // Show in popup UI with reason
  // Button opens upgrade URL in new tab
  chrome.tabs.create({ url: upgradeUrl });
}
```

## License Cache Strategy

- Cache license in `chrome.storage.local` with TTL (1-24 hours)
- On cache miss or expiry → re-verify with backend
- On network failure → use cached state (grace period)
- On extension update → re-verify immediately
