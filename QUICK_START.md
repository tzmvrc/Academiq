# Quick Start Guide: AI Features Implementation

## 🚀 Quick Setup (5 minutes)

### Step 1: Database Migration

```bash
# Connect to Supabase Dashboard → SQL Editor
# Copy and paste from MIGRATIONS.md
# Run all SQL commands
```

### Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install node-cron axios

# Frontend
cd frontend
npm install react-hot-toast
```

### Step 3: Set Environment Variables

**Backend (.env)**

```
AI_SERVICE_URL=http://localhost:8000/ai
PORT=5000
```

**Frontend (.env)**

```
VITE_API_URL=http://localhost:5000
```

### Step 4: Start Services (3 terminals)

**Terminal 1 - AI Service**

```bash
cd ai
python main.py
# Qwen model loads... wait ~30 seconds
# ✅ AI service running on http://localhost:8000
```

**Terminal 2 - Backend**

```bash
cd backend
npm start
# ✅ Point validation job started
# ✅ Server running on port 5000
```

**Terminal 3 - Frontend**

```bash
cd frontend
npm run dev
# ✅ Frontend running
```

---

## 🎯 Quick Feature Test

### Test 1: Point Validation (Scheduled)

```
1. Post a comment on any forum
2. Wait up to 1 hour (or manually trigger in scheduler)
3. See "You gained +X points" notification
4. Check user points increased
```

### Test 2: Comment Verification (Real-time)

```
1. Post comment with verifiable claim
   (e.g., "Einstein developed E=mc²")
2. See green checkmark badge next on author name
3. Hover badge to see source URL tooltip
4. Click badge to open source
```

---

## 📁 File Reference

| Feature                  | Files                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| **Point Validation**     | `point_validation_service.py`, `pointValidationJob.js`             |
| **Comment Verification** | `comment_verification_service.py`, `commentVerificationService.js` |
| **Schemas**              | `validation_schemas.py`                                            |
| **Frontend Hooks**       | `usePointNotifications.js`                                         |
| **UI Components**        | `VerificationBadge.jsx`, `VerificationBadge.css`                   |
| **Integration**          | `INTEGRATION_GUIDE.js`                                             |

---

## 🔍 Monitoring

### Check Point Validation Job

```javascript
// In backend logs, you'll see:
⏰ [2026-04-11T10:00:00.000Z] Starting point validation job...
📝 Found 15 ungraded comments. Processing...
  🔄 Grading comment abc123...
  ✅ Comment graded with 8 points
  ✅ User xyz now has 250 total points
✅ Processed 15 comments
```

### Check Comment Verification

```javascript
// In backend logs:
🔍 Verifying comment abc123...
  ✅ Verification result: is_verified=true, confidence=0.95
  ✅ Comment abc123 verification saved (verified=true)
```

---

## ⚡ Common Issues

| Issue                         | Solution                                           |
| ----------------------------- | -------------------------------------------------- |
| "Can't connect to AI service" | Ensure FastAPI running on port 8000                |
| "No points awarded"           | Check scheduler logs, verify AI service responding |
| "Badge not showing"           | Verify `is_ai_verified` in comment query           |
| "No notifications"            | Check Socket.IO connection or enable polling       |

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │ usePointNotifications Hook (Socket.IO + polling) │    │
│  │ VerificationBadge Component (with tooltip)       │    │
│  └──────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP + Socket.IO
┌────────────────────────┴────────────────────────────────┐
│              Express.js Backend (Node.js)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ commentVerificationService (Real-time, async)    │   │
│  │ pointValidationJob (Hourly scheduler cron)       │   │
│  │ AIService wrapper (calls FastAPI)                │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
                    ┌────┴──────┐
                    │            │
         ┌──────────┴───┐   ┌────┴──────────┐
         │  Supabase    │   │  FastAPI      │
         │   Database   │   │  AI Service   │
         │  (comments   │   │  (Qwen2.5)    │
         │   table)     │   │               │
         └──────────────┘   └────────────────┘
```

---

## 🎓 Understanding the Flow

### Point Validation Flow

```
Every hour at :00
  ↓
Fetch: SELECT * FROM comments WHERE points_processed_at IS NULL
  ↓
For each comment:
  Call AI API: /ai/validate-points
    ← Returns: {points: 8, reason: "...", is_valid: true}
  ↓
  UPDATE comments SET points_awarded = 8, points_processed_at = NOW()
  UPDATE users SET points = points + 8
  ↓
  CREATE notification: "You gained +8 points"
  ↓
  User sees toast: ✨ You gained +8 points
```

### Comment Verification Flow

```
User posts comment
  ↓
Comment created & saved (synchronously)
  ↓
Response sent immediately (fast)
  ↓
Background: Call AI API: /ai/verify-comment
    ← Returns: {is_verified: true, source_url: "...", confidence: 0.95}
  ↓
UPDATE comments SET is_ai_verified = true, verification_source_url = "..."
  ↓
Emit Socket.IO: comment:verified
  ↓
User sees badge next to author name
```

---

## 🚨 Important Notes

⚠️ **Do NOT:**

- Call point validation per comment (use scheduler instead)
- Trust AI service URLs without validation (we have safety checks)
- Block user response waiting for verification (it's async)
- Grade same comment twice (use points_processed_at check)

✅ **DO:**

- Let scheduler run hourly automatically
- Monitor logs for verification issues
- Test with a few comments before large deployment
- Ensure AI_SERVICE_URL is reachable from backend

---

## 🆘 Support Resources

1. **Full Documentation**: See `AI_FEATURES_IMPLEMENTATION.md`
2. **Integration Examples**: See `INTEGRATION_GUIDE.js`
3. **Database Changes**: See `MIGRATIONS.md`
4. **Code Comments**: Check docstrings in all service files

---

**Status**: ✅ Complete and Ready for Testing
