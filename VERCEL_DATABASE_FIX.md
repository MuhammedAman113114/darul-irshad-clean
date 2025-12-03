# Fix Vercel DATABASE_URL Environment Variable

## The Problem
The DATABASE_URL has an invalid format with `psql` prefix:
```
psql 'postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

## The Solution

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to: https://vercel.com/waitnots-projects/darul-irshad-clean/settings/environment-variables
2. Find `DATABASE_URL` and click Edit or Delete
3. Add new `DATABASE_URL` with this value:
   ```
   postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Select: Production, Preview
5. Mark as Sensitive: Yes
6. Click Save

### Option 2: Via CLI
```bash
vercel env add DATABASE_URL production
```
When prompted, paste:
```
postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Then add for preview:
```bash
vercel env add DATABASE_URL preview
```

### After Adding
Redeploy:
```bash
vercel --prod
```

## Note
- Removed `psql` prefix
- Removed `channel_binding=require` (not needed for Neon serverless)
- Removed extra quotes
