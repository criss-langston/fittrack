# Vercel Configuration Summary

## Overview
This document outlines the Vercel deployment configuration for the FitTrack app.

## Project Details
- **Project Name**: fittrack
- **Framework**: Next.js 16 (App Router)
- **Node.js Version**: 24.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Team**: criss-langstons-projects
- **Production Branch**: `main`

## Configuration File (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "nodejs": "18.x"
  },
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["iad1"],
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

## Deployment URLs

- **Production**: `fittrack-j3khzesjr-criss-langstons-projects.vercel.app`
- **Preview**: Automatic preview deployments for each PR

---

Configuration optimized: 2026-03-25 16:00 EDT
