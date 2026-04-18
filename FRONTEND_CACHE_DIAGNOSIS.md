# Frontend Feed Priority Debug Report

## Summary

- ✅ **Backend**: Verified working correctly - returns proper priority order (P2 → P3 → P4)
- ✅ **Main Component** (Index.tsx): Correctly calls `/forums/feed` endpoint
- ❌ **Caching**: localStorage cache (5 min TTL) may serve stale data
- ⚠️ **Legacy Component** (FeedTab.tsx): Not used but has wrong endpoint

## The Issue

You have a **5-minute localStorage cache** that could be showing stale forum data with incorrect priority after your followed subjects/users change.

**File**: [frontend/src/pages/Index.tsx](frontend/src/pages/Index.tsx#L148-L200)  
**Lines**: 148-200

```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const getCache = useCallback(() => {
  const cached = localStorage.getItem(`cache_feed_personalized`);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_DURATION;
    if (!isExpired) {
      return data; // ← Returns cached data without refreshing
    }
  }
  return null;
}, [getCacheKey]);
```

**Usage** ([Line 293](frontend/src/pages/Index.tsx#L293)):

```javascript
if (reset && !skipCache) {
  const cached = getCache();
  if (cached) {
    console.log("Using cached data");
    setForums(cached.forums); // ← Shows old priority order
    return; // ← Skips fresh fetch
  }
}
```

## How This Breaks Priority

**Scenario:**

1. **11:00 AM** - User loads feed, sees correct priority (P2: followed subject → P3: following users)
2. **11:02 AM** - User adds new subject to follow (or follows new user)
3. **11:03 AM** - User refreshes page
4. **Result** - Cache returns 11:00 AM data with old priority, not accounting for new follow
5. **Symptom** - Feed looks wrong for 5 minutes until cache expires

## Root Causes Identified

| #   | Issue                                 | Location                                                     | Impact                                        |
| --- | ------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| 1   | localStorage cache with 5-min TTL     | [Line 149](frontend/src/pages/Index.tsx#L149)                | Serves stale priority data                    |
| 2   | Cache check on page load              | [Line 293-303](frontend/src/pages/Index.tsx#L293-L303)       | Returns old data without validation           |
| 3   | No cache invalidation on user changes | Global                                                       | Follow/subject changes don't clear cache      |
| 4   | FeedTab.tsx legacy code               | [Line 73](frontend/src/components/dashboard/FeedTab.tsx#L73) | Calls `/forums` not `/forums/feed` (not used) |

## Verification Steps (Do These Now!)

### Step 1: Check Backend is Working

```bash
# Use the diagnostic script
node backend/scripts/diagnose_feed.js
# Should show P2 (subjects) → P3 (following) → P4 (trending)
```

### Step 2: Clear Browser Cache & Test

```
1. Open DevTools (F12)
2. Application → Storage → Local Storage
3. Find and delete ALL entries starting with "cache_feed"
4. Go back to home page and reload
5. Check if priority ordering is now correct
```

### Step 3: Check Console Logs

```javascript
// In browser DevTools console (F12), paste:
(function checkFeed() {
  const user = localStorage.getItem("user");
  const userId = user ? JSON.parse(user).id : null;

  console.log("=== FEED CHECK ===");
  console.log("User ID:", userId);
  console.log(
    "URL params:",
    new URLSearchParams(window.location.search).toString(),
  );

  // Check cache
  const caches = Object.keys(localStorage).filter((k) =>
    k.includes("cache_feed"),
  );
  console.log("Cached feeds:", caches);

  // If caching, when was it cached?
  caches.forEach((key) => {
    const data = JSON.parse(localStorage.getItem(key));
    const age = Math.round((Date.now() - data.timestamp) / 1000);
    console.log(`  ${key}: ${age} seconds old`);
  });
})();
```

## Solutions

### Solution 1: Disable Cache (Immediate Fix)

**Effect**: Feed always fresh, slightly slower loads
**Change**: [Line 293](frontend/src/pages/Index.tsx#L293)

Replace:

```javascript
if (reset && !skipCache) {
  const cached = getCache();
  if (cached) {
    // use cache
  }
}
```

With:

```javascript
if (reset && skipCache) {
  // Always skip cache for now
  // Cache disabled for debugging
}
```

Or call with `skipCache=true` from the trigger.

### Solution 2: Reduce Cache Duration

**Effect**: Stale data only lasts 30 seconds instead of 5 min
**Change**: [Line 149](frontend/src/pages/Index.tsx#L149)

```javascript
const CACHE_DURATION = 30 * 1000; // 30 seconds instead of 5 min
```

### Solution 3: Invalidate Cache on Follow Changes (Best)

**Effect**: Cache automatically clears when user follows/unfollows
**Location**: Wherever follow action happens (likely `user_service.ts`)

Add this after follow action succeeds:

```javascript
// When user follows a subject or user
const cacheKey = localStorage.getItem("cache_feed_personalized");
if (cacheKey) {
  localStorage.removeItem("cache_feed_personalized");
  console.log("✅ Feed cache invalidated after follow change");
}
// Then refresh feed with skipCache=true
loadForums(true, true); // reset=true, skipCache=true
```

### Solution 4: Fix FeedTab.tsx (If Used)

**Change**: [Line 73](frontend/src/components/dashboard/FeedTab.tsx#L73)

Replace:

```javascript
const res = await axiosInstance.get("/forums");
```

With:

```javascript
const res = await axiosInstance.get("/forums/feed");
```

Also remove the search filter that breaks ordering ([Lines 105-115](frontend/src/components/dashboard/FeedTab.tsx#L105-L115)).

## Recommended Fix Order

1. **Immediate** (Test if this is the issue):

   ```javascript
   // Line 293, temporarily disable cache
   if (reset && false) {
     // Disable cache temporarily
     const cached = getCache();
     if (cached) {
       setForums(cached.forums);
       return;
     }
   }
   // Then test if feed priority works correctly
   ```

2. **Short term**: Reduce cache to 30 seconds

3. **Long term**: Implement cache invalidation on follow changes

## Test Results Expected

**After clearing cache or disabling it:**

- ✅ First forum should be from a followed subject (P2)
- ✅ Next 4-10 forums from followed users (P3)
- ✅ Remaining forums should be trending/recent (P4)
- ✅ Within each tier, sorted by engagement score

**Before fix (with stale cache):**

- ❌ Priority order looks random
- ❌ After following new subject, it doesn't appear first
- ❌ Clicking refresh doesn't update order for 5 minutes

## Files to Review

| File                                                                                               | Issue               | Action                                       |
| -------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------- |
| [frontend/src/pages/Index.tsx](frontend/src/pages/Index.tsx#L148-L200)                             | Cache logic         | Consider reducing TTL or adding invalidation |
| [frontend/src/pages/Index.tsx](frontend/src/pages/Index.tsx#L293-L303)                             | Cache usage on load | Add skipCache parameter                      |
| [frontend/src/integration/forum_service.ts](frontend/src/integration/forum_service.ts#L374-L435)   | API calls           | ✅ Correct - no changes needed               |
| [frontend/src/components/dashboard/FeedTab.tsx](frontend/src/components/dashboard/FeedTab.tsx#L73) | Wrong endpoint      | Not used, but fix if repurposed              |

## Commands to Debug

```bash
# Clear all caches
localStorage.clear(); location.reload();

# Check what cache entries exist
Object.keys(localStorage).filter(k => k.includes('cache')).forEach(k => console.log(k, localStorage.getItem(k).substring(0, 100)));

# Disable cache completely (in console)
localStorage.removeItem('cache_feed_personalized');
window.skipFeedCache = true;

# Check network requests
# DevTools → Network tab → search for /forums
# Should see /forums/feed (not just /forums)
```

## Next Steps

1. ✅ Run the diagnostic script
2. ✅ Clear browser cache and test
3. ✅ Check console logs for cache messages
4. ✅ If priority works after clearing cache → Solution is cache-related
5. ✅ Implement recommended fixes
6. ✅ Test with follow/subject changes
