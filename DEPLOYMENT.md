# Deploying HealthDecode to Netlify

## Overview
This guide explains how to deploy the HealthDecode application to Netlify.

**Important**: Netlify only hosts static sites (frontend). The Python FastAPI backend needs to be deployed separately to a platform like Railway, Render, or Heroku.

---

## Step 1: Deploy the Backend

Choose one of these platforms for your Python FastAPI backend:

### Option A: Railway (Recommended - Free tier available)
1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project → Deploy from GitHub repo
3. Select your repository
4. Railway will auto-detect Python and deploy
5. Add environment variable: `PORT=8000`
6. Copy your deployment URL (e.g., `https://your-app.up.railway.app`)

### Option B: Render (Free tier available)
1. Go to [render.com](https://render.com) and sign up
2. New → Web Service → Connect your GitHub repo
3. Configure:
   - **Name**: healthdecode-backend
   - **Root Directory**: backend
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy your deployment URL (e.g., `https://healthdecode-backend.onrender.com`)

### Option C: Heroku
```bash
cd backend
heroku create healthdecode-backend
heroku buildpacks:set heroku/python
git push heroku main
```

---

## Step 2: Update Frontend Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Update `.env` with your deployed backend URL:
   ```
   VITE_API_BASE_URL=https://your-backend-url.railway.app/api
   ```

3. **Important**: Also update `netlify.toml` line 21:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://your-backend-url.railway.app/api/:splat"
   ```

---

## Step 3: Deploy Frontend to Netlify

### Method A: Netlify CLI (Quick)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Method B: Netlify Dashboard
1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-backend-url.railway.app/api`
6. Click "Deploy site"

---

## Step 4: Update Backend CORS

After deployment, update your backend's CORS settings to allow your Netlify URL:

In `backend/app/config.py`, add your Netlify URL:
```python
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://your-app.netlify.app",  # Add this
]
```

Commit and push changes to redeploy the backend.

---

## Step 5: Test Your Deployment

1. Visit your Netlify URL (e.g., `https://your-app.netlify.app`)
2. Click "Analyze Your Report"
3. Upload a medical PDF
4. Verify the analysis works correctly

---

## Troubleshooting

### CORS Errors
- Ensure your Netlify URL is added to `ALLOWED_ORIGINS` in backend config
- Redeploy backend after updating CORS settings

### API Connection Failed
- Check `VITE_API_BASE_URL` in Netlify environment variables
- Verify backend is running (visit `https://your-backend-url/api/health`)
- Check backend logs for errors

### Build Failed
- Ensure all dependencies are in `package.json`
- Check Node version (Netlify uses Node 18 by default)
- Review build logs in Netlify dashboard

---

## Environment Variables Reference

**Netlify (Frontend)**:
- `VITE_API_BASE_URL`: Your backend API URL

**Backend Platform**:
- `PORT`: Port number (usually auto-set)
- `TESSERACT_CMD`: Path to Tesseract (if not in PATH)

---

## Custom Domain (Optional)

In Netlify dashboard:
1. Go to "Domain settings"
2. Click "Add custom domain"
3. Follow DNS configuration instructions

---

## Continuous Deployment

Both Netlify and Railway/Render support automatic deployments:
- Push to GitHub → Automatically deploys
- Frontend and backend deploy independently
- No manual intervention needed

---

## Cost Estimate

- **Netlify**: Free tier (100GB bandwidth/month)
- **Railway**: Free tier ($5 credit/month, then $0.000463/GB-hour)
- **Render**: Free tier (750 hours/month, sleeps after inactivity)

For production, consider paid tiers for better reliability.
