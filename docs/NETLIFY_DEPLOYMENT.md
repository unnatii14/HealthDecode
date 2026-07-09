# HealthDecode - Netlify Deployment

## Quick Deploy Button

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

## What's Included

This repository is configured for easy Netlify deployment with:

- ✅ `netlify.toml` - Build configuration and redirects
- ✅ Environment variables setup (`.env.example`)
- ✅ Optimized Vite build process
- ✅ Client-side routing support
- ✅ Security headers configured

## Before Deploying

⚠️ **Important**: Netlify only hosts the frontend. Deploy the backend separately first!

1. **Deploy Backend** to Railway/Render/Heroku (see [DEPLOYMENT.md](DEPLOYMENT.md))
2. **Get Backend URL** (e.g., `https://your-app.railway.app`)
3. **Update Configuration**:
   - Set `VITE_API_BASE_URL` in Netlify environment variables
   - Update `netlify.toml` line 21 with your backend URL

## Deploy Steps

### Option 1: One-Click Deploy
1. Click the "Deploy to Netlify" button above
2. Connect your GitHub account
3. Configure environment variables
4. Deploy!

### Option 2: Manual Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Option 3: GitHub Integration
1. Go to [app.netlify.com](https://app.netlify.com)
2. "Add new site" → "Import an existing project"
3. Select this repository
4. Netlify auto-detects settings from `netlify.toml`
5. Add environment variable: `VITE_API_BASE_URL=https://your-backend.railway.app/api`
6. Deploy!

## Post-Deployment

1. ✅ Visit your site (e.g., `https://your-app.netlify.app`)
2. ✅ Test PDF upload functionality
3. ✅ Update backend CORS to allow your Netlify URL
4. ✅ (Optional) Configure custom domain

## Full Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:
- Backend deployment options
- Environment variables reference
- Troubleshooting guide
- Custom domain setup

## Support

For issues, check:
- Netlify build logs
- Backend API health: `https://your-backend-url/api/health`
- Browser console for errors
