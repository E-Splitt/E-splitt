# How to Set Up Supabase for Real-Time Sync

Supabase is a free, open-source alternative to Firebase. It uses a standard SQL database (PostgreSQL).

## 1. Create a Project
1. Go to [supabase.com](https://supabase.com/) and sign up/login.
2. Click **"New Project"**.
3. Choose your organization (or create one).
4. Name: **"E-Split"**.
5. Password: Generate a strong password (you won't need it often).
6. Region: Choose one close to you.
7. Click **"Create new project"**.
8. Wait a minute for it to set up.

## 2. Get API Keys
1. Once the project is ready, go to **Project Settings** (cog icon at the bottom left).
2. Click **"API"**.
3. Copy the **Project URL**.
4. Copy the **`anon`** public key.
5. Open `src/supabase.js` in your code editor.
6. Paste these values into the file.

## 3. Create the Database Table
We need a place to store the groups.
1. Go to the **Table Editor** (icon looks like a spreadsheet on the left).
2. Click **"New Table"**.
3. Name: `groups`
4. Uncheck "Enable Row Level Security (RLS)" for now (we'll keep it simple).
   *   *Note: It will warn you, but for this test app, it's fine.*
5. Columns:
   *   `id`: leave as is (int8, primary key)
   *   Add a new column:
       *   Name: `group_id`
       *   Type: `text`
   *   Add another column:
       *   Name: `data`
       *   Type: `jsonb`
6. Click **"Save"**.

## 4. Enable Realtime
To make updates appear instantly:
1. Go to **Database** (icon looks like a cylinder/storage).
2. Click **"Replication"** in the side menu.
3. Click the toggle for the `supabase_realtime` publication.
4. Make sure the `groups` table is selected/enabled.

## 5. You're Done!
Let me know when you've done this, and I'll update the app to save to Supabase!
