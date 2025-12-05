# Authentication Setup - Quick Guide

## Your Supabase Project
**URL**: `https://zgykugrvbfteuzxyxoot.supabase.co`  
Already configured in `src/supabase.js` ✅

---

## Step 1: Enable Email Auth
1. Go to https://supabase.com/dashboard/project/zgykugrvbfteuzxyxoot
2. Click **Authentication** → **Providers**
3. Ensure **Email** is ENABLED
4. **UNCHECK** "Enable email confirmations" (for testing)
5. Click **Save**

## Step 2: Set URLs
1. In **Authentication**, click **URL Configuration**
2. **Site URL**: `http://localhost:5174`
3. **Redirect URLs**: `http://localhost:5174/**`
4. Click **Save**

## Step 3: Run SQL Migration
1. Go to **SQL Editor** (icon: `</>`)
2. Click **New Query**
3. Copy ALL code from `supabase_auth_setup.sql`
4. Paste and click **Run**
5. Wait for success ✅

## Step 4: Create Admin User
**Option A - Dashboard:**
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Email: `mdashwaq98@gmail.com`
4. Password: (your choice)
5. ✅ Check "Auto Confirm User"
6. Click **Create** and copy the **User UID**

**Option B - Use App:**
- Click "Sign Up" after app loads

## Step 5: Assign Existing Groups (Dashboard method only)
If you created user via dashboard:
```sql
-- Get your user ID
SELECT id FROM auth.users WHERE email = 'mdashwaq98@gmail.com';

-- Assign groups (replace with your UUID)
UPDATE groups SET user_id = 'YOUR_UUID_HERE' WHERE user_id IS NULL;

-- Make it required
ALTER TABLE groups ALTER COLUMN user_id SET NOT NULL;
```

---

## ✅ Done! 
Refresh http://localhost:5174 - you should see the login screen!
