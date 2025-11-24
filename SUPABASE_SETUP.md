# Supabase Local Development Setup

This guide will help you set up Supabase locally for development without using the cloud.

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Node.js 20+** and **pnpm**
- **Git**

## Installation

### 1. Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using Homebrew (macOS/Linux)
brew install supabase/tap/supabase

# Or download binary directly
# Visit: https://github.com/supabase/cli/releases
```

Verify installation:
```bash
supabase --version
```

### 2. Initialize Supabase in Your Project

Navigate to your project root:
```bash
cd python-whatsapp-bot
```

Initialize Supabase (if not already done):
```bash
supabase init
```

This creates a `supabase/` directory with configuration files.

## Running Supabase Locally

### 1. Start Supabase Services

From the project root, run:

```bash
supabase start
```

This command will:
- Pull Docker images (first time only)
- Start PostgreSQL database
- Start Studio (web UI)
- Start GoTrue (auth server)
- Start Realtime server
- Start Storage server
- Start Edge Functions runtime
- Start Inbucket (email testing)

**First-time setup takes ~2-5 minutes.** Subsequent starts are much faster.

### 2. Get Your Local Credentials

After `supabase start` completes, you'll see output like:

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these values!** You'll need them for your `.env.local`

### 3. Configure Environment Variables

Create `app/frontend/.env.local`:

```env
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-above>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-above>

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_APP_SECRET=your-app-secret

# AI Provider (choose one)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-api-key
# OPENAI_API_KEY=your-api-key
# GEMINI_API_KEY=your-api-key

# Business Info
BUSINESS_NAME="Your Clinic"
BUSINESS_ADDRESS="Your Address"
TIMEZONE=Asia/Riyadh
```

## Database Migrations

### Apply Migrations

Your database schema is defined in `supabase/migrations/`. To apply them:

```bash
# Apply all migrations
supabase db reset

# Or apply specific migration
supabase migration up
```

### Create New Migration

```bash
# Create a new migration file
supabase migration new my_new_migration

# Edit the file in supabase/migrations/
# Then apply it
supabase migration up
```

### Generate TypeScript Types

After migrations, generate TypeScript types:

```bash
cd app/frontend
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## Supabase Studio (Web UI)

Access Supabase Studio at `http://localhost:54323`

Features:
- **Table Editor**: View and edit data
- **SQL Editor**: Run SQL queries
- **Authentication**: Manage users
- **Storage**: Upload files
- **API Docs**: Auto-generated API documentation

### Default Credentials

- **Email**: Any email (local mode doesn't require real emails)
- **Password**: Any password (minimum 6 characters)

## Testing Authentication

### Create Test User

**Option 1: Using Supabase Studio**
1. Go to `http://localhost:54323`
2. Navigate to Authentication → Users
3. Click "Add User"
4. Enter email and password
5. Click "Create User"

**Option 2: Using SQL**
```sql
-- In Studio SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

**Option 3: Using the App**
1. Start your Next.js app: `npm run dev`
2. Go to `http://localhost:3000/auth/signup`
3. Sign up with any email/password
4. User will be automatically confirmed in local mode

## Email Testing

Supabase local includes **Inbucket** for email testing.

Access at: `http://localhost:54324`

All emails sent by your app will appear here (e.g., password reset, verification emails).

## Database Access

### Using psql

```bash
# Connect to local database
psql postgresql://postgres:postgres@localhost:54322/postgres
```

### Using Database GUI (e.g., pgAdmin, DBeaver)

Connection details:
- **Host**: `localhost`
- **Port**: `54322`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `postgres`

## Edge Functions (Local)

### Deploy Functions Locally

```bash
# Serve all functions
supabase functions serve

# Serve specific function
supabase functions serve send-reminders
```

Functions will be available at:
```
http://localhost:54321/functions/v1/send-reminders
```

### Invoke Functions Locally

```bash
# Using curl
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/send-reminders' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{}'

# Using Supabase CLI
supabase functions invoke send-reminders
```

## Realtime Testing

Test realtime subscriptions:

```typescript
// In your React component
import { useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

function MyComponent() {
  useEffect(() => {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('Change received!', payload)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return <div>Listening for changes...</div>
}
```

## Stopping Supabase

```bash
# Stop all services
supabase stop

# Stop and remove volumes (resets database)
supabase stop --no-backup
```

## Troubleshooting

### Port Conflicts

If ports are already in use, edit `supabase/config.toml`:

```toml
[api]
port = 54321  # Change if needed

[db]
port = 54322  # Change if needed

[studio]
port = 54323  # Change if needed
```

### Reset Everything

```bash
# Stop and remove all data
supabase stop --no-backup

# Start fresh
supabase start
```

### Check Service Status

```bash
# View running services
supabase status

# View logs
docker compose -f supabase/docker/docker-compose.yml logs
```

### Database Connection Issues

```bash
# Restart database
supabase db reset

# Check if PostgreSQL is running
docker ps | grep postgres
```

## Development Workflow

**Daily workflow:**

```bash
# 1. Start Supabase
supabase start

# 2. Start Next.js dev server
cd app/frontend
npm run dev

# 3. Develop your app...

# 4. When done, stop Supabase (optional)
supabase stop
```

**After schema changes:**

```bash
# 1. Apply migrations
supabase db reset

# 2. Regenerate types
cd app/frontend
supabase gen types typescript --local > src/lib/supabase/database.types.ts

# 3. Restart dev server
npm run dev
```

## Production Deployment

When ready for production:

1. Create Supabase project at https://supabase.com
2. Link your local project:
   ```bash
   supabase link --project-ref <your-project-id>
   ```
3. Push migrations to production:
   ```bash
   supabase db push
   ```
4. Update `.env.local` with production URLs
5. Deploy your Next.js app

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Local Development**: https://supabase.com/docs/guides/cli/local-development
- **CLI Reference**: https://supabase.com/docs/reference/cli
- **Migrations**: https://supabase.com/docs/guides/cli/managing-database-migrations

## Quick Reference

### Common Commands

```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# Reset database
supabase db reset

# Generate types
supabase gen types typescript --local

# View status
supabase status

# Run migrations
supabase migration up

# Create migration
supabase migration new <name>

# Serve functions
supabase functions serve

# Link to cloud project
supabase link --project-ref <ref>

# Push to production
supabase db push
```

### Environment Variables

**Local Development:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start>
```

**Production:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-dashboard>
```

---

**Happy developing with Supabase locally! 🚀**
