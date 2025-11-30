# Vercel Deployment Guide

## 🚀 Quick Start

### 1. **Set Up Vercel Postgres**
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project (or select existing)
3. Go to **Storage** tab → **Create Database** → Select **Postgres**
4. Copy the `DATABASE_URL` connection string

### 2. **Required Environment Variables**

Add these in Vercel → Project Settings → Environment Variables:

```bash
# Database (will be auto-added by Vercel Postgres)
DATABASE_URL="postgresql://..."

# Clerk Authentication (from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Anthropic Claude API (from https://console.anthropic.com)
ANTHROPIC_API_KEY="sk-ant-..."

# ElevenLabs TTS API (from https://elevenlabs.io)
ELEVENLABS_API_KEY="..."
```

### 3. **Deploy Steps**

```bash
# Option A: Use Vercel CLI
npm i -g vercel
vercel

# Option B: Use GitHub Integration
# 1. Push your code to GitHub
# 2. Import project in Vercel dashboard
# 3. Vercel will auto-deploy on every push
```

### 4. **After First Deploy**

Run database migrations:

```bash
# In Vercel dashboard → Deployments → [Your Latest Deployment]
# Go to the deployment's "..." menu → "Run Command"
npx prisma migrate deploy
```

Or use Vercel CLI:
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

---

## 📋 Checklist

- [ ] Vercel Postgres database created
- [ ] All environment variables added in Vercel
- [ ] Clerk webhook URLs updated (if using webhooks)
- [ ] First deployment successful
- [ ] Database migrations run
- [ ] Test authentication flow
- [ ] Test all features (CV upload, galaxy, interview coach, etc.)

---

## 🔧 Local Development with Postgres

If you want to test with PostgreSQL locally:

1. **Install PostgreSQL** (or use Docker)
   ```bash
   brew install postgresql@14
   brew services start postgresql@14
   ```

2. **Create local database**
   ```bash
   createdb job_finder_dev
   ```

3. **Update your .env.local**
   ```bash
   DATABASE_URL="postgresql://localhost:5432/job_finder_dev?schema=public"
   ```

4. **Run migrations**
   ```bash
   npx prisma migrate dev
   ```

---

## 🆘 Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### Database connection issues
- Check Vercel logs for exact error
- Verify `DATABASE_URL` is set correctly
- Ensure Vercel Postgres is in the same region

### Build failures
- Check all env vars are set
- Ensure `prisma generate` runs in build command
- Verify `@prisma/client` is in `dependencies` (not devDependencies)

---

## 📚 Additional Resources

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma + Vercel Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Clerk + Vercel](https://clerk.com/docs/deployments/deploy-to-vercel)
