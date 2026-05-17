# PostgreSQL on macOS (local, no Docker)

## How the app connects

`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Prisma CLI and the Next.js app (`src/lib/prisma.ts`) both read **`DATABASE_URL`** from **`.env`** in the project root.

Expected local URL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cloudcontent_tr?schema=public"
```

| Part | Value |
|------|--------|
| User | `postgres` |
| Password | `postgres` |
| Host | `localhost` |
| Port | `5432` |
| Database | `cloudcontent_tr` |

Change **only** `.env` (not the schema) if your local user or password is different.

---

## macOS setup (Homebrew)

### 1. Install and start PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
```

Check the service:

```bash
brew services list | grep postgresql
pg_isready -h localhost -p 5432
```

You should see `accepting connections`.

### 2. Create role, database, and match `.env`

Homebrew usually creates a superuser named **your macOS username**, not `postgres`.  
If Prisma reports `role "postgres" does not exist`, run the project setup script **once**:

```bash
chmod +x scripts/setup-macos-postgres.sh
./scripts/setup-macos-postgres.sh
```

Or manually:

```bash
# Connect as your macOS user (default for Homebrew)
psql -d postgres -c "CREATE ROLE postgres WITH LOGIN PASSWORD 'postgres' SUPERUSER CREATEDB;"
createdb -O postgres cloudcontent_tr
# if createdb fails because DB exists:
# psql -d postgres -c "CREATE DATABASE cloudcontent_tr OWNER postgres;"
```

### 3. Environment file

```bash
cp .env.example .env
```

Ensure `.env` contains:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cloudcontent_tr?schema=public"
```

### 4. Prisma and app

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed    # optional
npm run dev
```

Documented workflow (same as above):

```bash
brew services start postgresql@16
createdb cloudcontent_tr          # skip if setup script already created it
npx prisma generate
npx prisma migrate dev
npm run dev
```

---

## Using a different PostgreSQL user or password

Update **`DATABASE_URL` in `.env` only**:

```env
# Homebrew default (often no password on localhost):
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/cloudcontent_tr?schema=public"

# Custom user and password:
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/cloudcontent_tr?schema=public"
```

Restart `npm run dev` after changing `.env`.

Create the database for your user if needed:

```bash
createdb cloudcontent_tr
```

---

## Verify connection

```bash
# Service up
pg_isready -h localhost -p 5432

# Login with URL from .env
psql "postgresql://postgres:postgres@localhost:5432/cloudcontent_tr" -c "SELECT 1;"

# Prisma
npx prisma generate
npx prisma migrate dev
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|--------|-----|
| `Can't reach database server at localhost:5432` | Postgres not running | `brew services start postgresql@16` |
| `role "postgres" does not exist` | Homebrew default user is your macOS name | Run `./scripts/setup-macos-postgres.sh` or update `DATABASE_URL` to your macOS user |
| `password authentication failed` | Wrong password in `DATABASE_URL` | Fix `.env` or `ALTER ROLE postgres PASSWORD 'postgres';` |
| `database "cloudcontent_tr" does not exist` | DB not created | `createdb cloudcontent_tr` or run setup script |
| `Environment variable not found: DATABASE_URL` | No `.env` | `cp .env.example .env` |

---

## Prisma commands

```bash
npx prisma generate      # generate client (also: npm run db:generate)
npx prisma migrate dev   # apply migrations in dev (also: npm run db:migrate)
npm run dev              # start Next.js
```

Other scripts: `npm run db:seed`, `npm run db:studio`, `npm run db:reset`.
