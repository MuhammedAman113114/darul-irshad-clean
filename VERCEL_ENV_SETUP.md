# Vercel Environment Variables Setup

## Your Deployment Status ✅
- **Production URL**: https://darul-irshad-clean-ik9qznt7l-waitnots-projects.vercel.app
- **Project**: darul-irshad-clean
- **Status**: Successfully deployed

## Database Connection Issue ⚠️

Your `.env.local` has an incorrect format:
```
NEON_DATABASE_URL="psql 'postgresql://...'"
```

It should be:
```
DATABASE_URL="postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

## Quick Fix - Add Environment Variable via Vercel Dashboard

### Option 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/waitnots-projects/darul-irshad-clean/settings/environment-variables

2. Click **"Add New"**

3. Add the following:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environments**: Select **Production** and **Preview**
   - **Sensitive**: Check this box ✅

4. Click **Save**

5. Redeploy your app:
   ```bash
   vercel --prod
   ```

### Option 2: Using Vercel CLI

Run this command and paste the database URL when prompted:

```bash
vercel env add DATABASE_URL production
```

When prompted for the value, paste:
```
postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Then add for preview:
```bash
vercel env add DATABASE_URL preview
```

## Fix Local .env.local File

Update your `.env.local` file to:

```env
DATABASE_URL="postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

Remove the `psql` prefix and the extra quotes.

## After Adding Environment Variables

1. **Redeploy to production**:
   ```bash
   vercel --prod
   ```

2. **Test your app**: Visit your production URL and verify database connectivity

3. **Check logs** if there are issues:
   ```bash
   vercel logs
   ```

## Important Notes

- ⚠️ The `DATABASE_URL` in your `.env.local` has incorrect format (includes `psql` command)
- ✅ Your app is deployed but may not connect to database without proper env var
- 🔒 Always mark database URLs as sensitive in Vercel
- 📝 The `.env.local` file is already in `.gitignore` (good!)

## Current Deployment URLs

- **Production**: https://darul-irshad-clean.vercel.app
- **Latest Preview**: https://darul-irshad-clean-b9ai6vd8b-waitnots-projects.vercel.app

## Next Steps

1. Add `DATABASE_URL` via Vercel dashboard (easiest)
2. Redeploy with `vercel --prod`
3. Test the production app
4. Your Darul Irshad Student Management System will be live! 🎉
