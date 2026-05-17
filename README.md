# CloudContent TR

AI destekli içerik yayın platformu — admin paneli (Next.js App Router).

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Prisma + PostgreSQL (local on macOS)

## Prerequisites

- Node.js 20+
- PostgreSQL 16 via Homebrew (`brew install postgresql@16`)

## Local development (macOS + PostgreSQL)

### 1. Start PostgreSQL

```bash
brew services start postgresql@16
pg_isready -h localhost -p 5432   # should print: accepting connections
```

### 2. Database and `.env`

```bash
cp .env.example .env
```

Default connection (edit `.env` if your user/password differ):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cloudcontent_tr?schema=public"
SETTINGS_ENCRYPTION_KEY="your-secret-key-at-least-16-characters"
```

`SETTINGS_ENCRYPTION_KEY` is **server-only** (encrypts API keys in the database). After editing `.env`, restart `npm run dev`. Check status on `/settings`.

**Homebrew note:** the `postgres` role often does not exist until you create it. Run once:

```bash
chmod +x scripts/setup-macos-postgres.sh
./scripts/setup-macos-postgres.sh
```

Or create the database manually:

```bash
createdb cloudcontent_tr
```

See **[docs/DATABASE.md](docs/DATABASE.md)** if you use another macOS user or password.

### 3. Prisma and app

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed    # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → `/dashboard`

### Quick reference

```bash
brew services start postgresql@16
createdb cloudcontent_tr
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Sayfalar

| Route | Açıklama |
|-------|----------|
| `/dashboard` | Genel bakış |
| `/sources` | URL kaynakları |
| `/uploads` | Dosya yüklemeleri |
| `/articles` | Makale listesi |
| `/articles/new` | Yeni makale |
| `/instagram` | Instagram taslakları |
| `/settings` | Ayarlar |
| `/logs` | İş günlükleri |

## Azure deployment

See **[README_GITHUB_AZURE_DEPLOYMENT.md](./README_GITHUB_AZURE_DEPLOYMENT.md)** for GitHub → Azure App Service (PostgreSQL, Blob, Prisma migrations).

## Komutlar

```bash
npm run dev              # geliştirme sunucusu
npm run build            # prisma generate + production build
npm run start            # production server (PORT default 3000)

npx prisma generate      # Prisma Client
npx prisma migrate dev   # migrations (≈ npm run db:migrate)

npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Veritabanı modelleri

`prisma/schema.prisma` — `User`, `SourceUrl`, `UploadedDocument`, `Article`, `SocialPost`, `InstagramAccount`, `JobLog`, ve diğerleri.
