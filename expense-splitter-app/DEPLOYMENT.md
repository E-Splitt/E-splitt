# How to Deploy E-Split

## 1. Build for Production
Run the following command to create a production-ready build of your app:

```bash
cd expense-splitter-app
npm run build
```

This will create a `dist` folder containing all the files needed for deployment.

## 2. Deploy to Netlify (Recommended)
Netlify is free and easiest for React apps.

### Option A: Drag & Drop (Easiest)
1. Go to [app.netlify.com](https://app.netlify.com) and sign up/login.
2. Go to the "Sites" tab.
3. Drag and drop the `dist` folder from your project into the upload area.
4. Your site will be live in seconds!

### Option B: Using GitHub (Best for updates)
1. Push your code to a GitHub repository.
2. Log in to Netlify and click "Add new site" -> "Import from an existing project".
3. Connect to GitHub and select your repository.
4. Netlify will detect the settings automatically (Build command: `npm run build`, Publish directory: `dist`).
5. Click "Deploy".
6. Now, every time you push code to GitHub, Netlify will automatically update your site!

## 3. PWA (Mobile App) Features
Your app is now a Progressive Web App (PWA)!
- **Installable**: Users can "Add to Home Screen" on iOS and Android.
- **Offline Capable**: It works even with spotty internet.
- **App-like Feel**: Runs in its own window without browser bars.

## 4. Sharing with Friends
Once deployed, you will get a URL (e.g., `https://your-app-name.netlify.app`).
1. Send this URL to your friends.
2. They can open it and install it on their phones.
3. To share a group:
   - Go to the group in your app.
   - Click the **Edit (pencil)** icon -> **Share Group**.
   - Copy the link or download the JSON file.
   - Send it to your friend.
   - They can import it to see the same expenses!
