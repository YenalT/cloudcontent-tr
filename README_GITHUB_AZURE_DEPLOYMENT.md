# GitHub → Azure App Service deployment guide

CloudContent TR — Next.js 15, Prisma, PostgreSQL, Azure Blob Storage.

---

## Deployment checklist

- [ ] Code pushed to GitHub (`main` branch)
- [ ] Azure Resource Group created
- [ ] Azure Database for PostgreSQL Flexible Server created
- [ ] Database `cloudcontent_tr` created; firewall allows Azure services
- [ ] `DATABASE_URL` set in App Service (with `sslmode=require` for Azure PG)
- [ ] Azure Storage account + containers:
  - [ ] `instagram-assets` (public read for blob URLs — Instagram/Zapier)
  - [ ] `documents` (uploaded PDF/DOCX/PPTX)
- [ ] App Service (Linux) Node 20 LTS
- [ ] Application settings configured (see below)
- [ ] Startup command: `bash startup.sh`
- [ ] `npx prisma migrate deploy` succeeded (CI or startup)
- [ ] `SETTINGS_ENCRYPTION_KEY` set (never rotate without plan)
- [ ] `APP_URL` / `APP_PUBLIC_URL` = production HTTPS URL (not localhost)
- [ ] `STORAGE_PROVIDER=azure` and `SOCIAL_IMAGE_STORAGE_PROVIDER=azure`
- [ ] Open `/settings` — configure Azure OpenAI, Blob (if not env-only), Zapier
- [ ] Smoke test: `/dashboard`, upload document, Instagram draft, Zapier test

---

## 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Prepare Azure App Service deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

Ensure `.env` is **not** committed (listed in `.gitignore`).

---

## 2. Create Azure resources

### PostgreSQL

1. Azure Portal → **Create** → **Azure Database for PostgreSQL flexible server**
2. Choose region, PostgreSQL 16, Burstable or General Purpose
3. Set admin user/password
4. Networking: allow Azure services; add your IP for initial admin
5. Create database: `cloudcontent_tr`
6. Connection string (App Service):

```text
postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/cloudcontent_tr?schema=public&sslmode=require
```

### Storage account

1. Create Storage account (StorageV2, LRS or GRS)
2. Containers:
   - `instagram-assets` — **Blob public access** if using direct blob URLs (or configure CDN / public base URL)
   - `documents` — private or limited access (app reads via connection string)
3. Copy **Connection string** from Access keys

### App Service

1. Create **Web App**
2. Publish: **Code**
3. Runtime: **Node 20 LTS**
4. OS: **Linux**
5. Region: same as DB/Storage when possible

---

## 3. Connect GitHub to App Service (Deployment Center)

1. App Service → **Deployment Center**
2. Source: **GitHub**
3. Authorize Azure → select org/repo/branch (`main`)
4. Build provider options:
   - **GitHub Actions** (recommended — uses `.github/workflows/azure-app-service.yml`)
   - **App Service build service (Oryx)** — builds on deploy with `npm install` + `npm run build`
5. Save

If using **Oryx** only (no Actions workflow), set:

- **Startup Command**: `bash startup.sh`

---

## 4. Application settings (App Service → Configuration)

### Set `DATABASE_URL` in Azure App Service (required)

Prisma and the app read **`DATABASE_URL` only from environment variables** in production (not from committed files). If the setting exists but **Value is blank**, Prisma receives an empty string and `migrate deploy` fails.

1. Sign in to [Azure Portal](https://portal.azure.com).
2. Open **App Services** → select your web app (e.g. `cloudcontent-tr-prod`).
3. In the left menu, open **Settings** → **Environment variables**  
   (on older blades: **Configuration** → **Application settings** tab).
4. Under **App settings**, click **+ Add**.
5. Set:
   - **Name:** `DATABASE_URL` (exact spelling, case-sensitive)
   - **Value:** your PostgreSQL connection string, for example:

```text
postgresql://cloudadmin:YOUR_PASSWORD@your-server.postgres.database.azure.com:5432/cloudcontent_tr?schema=public&sslmode=require
```

6. Replace `cloudadmin`, `YOUR_PASSWORD`, and `your-server` with your Flexible Server admin user, password, and hostname.
7. Click **Apply** at the bottom, then **Confirm** when prompted (the app restarts).
8. Open **Monitoring** → **Log stream** and redeploy or restart. You should **not** see `[startup] ERROR: DATABASE_URL is missing or empty`.

**Checklist**

- [ ] `DATABASE_URL` appears in Application settings with a **non-empty** value
- [ ] Connection string includes `sslmode=require` for Azure Database for PostgreSQL
- [ ] Database name is `cloudcontent_tr` (or the name you created)
- [ ] PostgreSQL **Networking** allows Azure services (and the app can reach the server)
- [ ] Password special characters are [URL-encoded](https://www.w3schools.com/tags/ref_urlencode.asp) in the connection string if needed

**Copy connection string from Azure (optional)**

1. Azure Portal → your **PostgreSQL flexible server** → **Connect**
2. Choose database `cloudcontent_tr`, copy the ADO.NET or connection info, then format as a `postgresql://` URL as shown above.

**Do not** add `DATABASE_URL` to the GitHub repository. For CI migrations, use a **GitHub Actions secret** (see [§9](#9-github-actions-secrets-optional-workflow)).

---

| Setting | Required | Example / notes |
|---------|----------|-----------------|
| `DATABASE_URL` | Yes | Azure PostgreSQL URL with `sslmode=require` (see steps above) |
| `SETTINGS_ENCRYPTION_KEY` | Yes | 32+ char random secret |
| `NODE_ENV` | Yes | `production` |
| `APP_URL` | Yes | `https://YOUR_APP.azurewebsites.net` |
| `APP_PUBLIC_URL` | Yes | Same as APP_URL or custom domain |
| `STORAGE_PROVIDER` | Yes | `azure` |
| `SOCIAL_IMAGE_STORAGE_PROVIDER` | Yes | `azure` |
| `AZURE_STORAGE_CONNECTION_STRING` | Yes | Storage account connection string |
| `AZURE_BLOB_CONTAINER_NAME` | Yes | `instagram-assets` |
| `AZURE_DOCUMENTS_CONTAINER_NAME` | Yes | `documents` |
| `AZURE_STORAGE_PUBLIC_BASE_URL` | Optional | Custom CDN/base URL for public blobs |
| `META_APP_ID` / `META_APP_SECRET` | Optional | Instagram OAuth |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | Optional | `false` — do not rely on local disk in production |

Do **not** set `STORAGE_PROVIDER=local` or `SOCIAL_IMAGE_STORAGE_PROVIDER=local` in production.

Optional provider keys (`OPENAI_API_KEY`, `ZAPIER_WEBHOOK_URL`) can be set here or via **Settings** UI (encrypted in DB).

---

## 5. Startup command

App Service → **Configuration** → **General settings** → **Startup Command**:

```bash
bash startup.sh
```

`startup.sh` will:

1. Run `npx prisma migrate deploy`
2. Start Next.js standalone (`node .next/standalone/server.js`) or `npm run start`

Make `startup.sh` executable if needed:

```bash
chmod +x startup.sh
git add startup.sh
git commit -m "chmod startup.sh"
git push
```

---

## 6. Prisma migrations

**Never** run `prisma migrate dev` in production.

### Option A — startup.sh (default)

Migrations run on each app start via `startup.sh`.

### Option B — GitHub Actions (workflow included)

1. GitHub → repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
   - **Name:** `DATABASE_URL`
   - **Secret:** same PostgreSQL URL as Azure (`sslmode=require`)
3. Push to `main` or run the workflow manually.

The workflow validates the secret (fails fast if missing/empty), then runs `npm run prisma:migrate:deploy` with `DATABASE_URL` from secrets.

### Option C — manual (one-off)

```bash
# From your machine with network access to Azure PostgreSQL
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

---

## 7. Build & start commands (Oryx)

If using Oryx without custom workflow:

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Output | `.next` (standalone copied by `scripts/copy-standalone-assets.sh`) |
| Startup | `bash startup.sh` |

Local verification:

```bash
npm ci
npm run build
npm run start
# http://localhost:3000
```

---

## 8. Verify deployment

1. Open `https://YOUR_APP.azurewebsites.net/dashboard`
2. **Settings** — encryption key status green; test Azure Blob connection
3. Upload a document on `/uploads` — should use Azure (`documents` container)
4. Create Instagram draft — image should upload to `instagram-assets` HTTPS URL
5. Approve → **Send to Zapier** — `postImageUrl` must be `https://` (not localhost)
6. Check App Service **Log stream** for `[startup]` and Prisma errors

---

## 9. GitHub Actions secrets (optional workflow)

| Secret | Description |
|--------|-------------|
| `AZURE_WEBAPP_NAME` | App Service name |
| `AZURE_CREDENTIALS` | Service principal JSON for `azure/login` |
| `DATABASE_URL` | **Required** for `prisma migrate deploy` in CI — same value as App Service `DATABASE_URL` |

If `DATABASE_URL` is not configured as a secret, GitHub passes an empty string and the **Validate DATABASE_URL secret** step fails with instructions (no credentials are printed).

Create service principal:

```bash
az login
az ad sp create-for-rbac --name "github-cloudcontent-deploy" \
  --role contributor \
  --scopes /subscriptions/SUBSCRIPTION_ID/resourceGroups/RESOURCE_GROUP \
  --sdk-auth
```

Paste JSON into `AZURE_CREDENTIALS` secret. **Do not commit.**

---

## 10. Security notes

- No API keys in the repository
- `SETTINGS_ENCRYPTION_KEY` only on server (App Settings)
- Admin UI routes are **not** behind NextAuth — use Azure Easy Auth or network restrictions for production
- Instagram/Zapier images must be public HTTPS blob URLs — validated before webhook send
- Local storage is blocked when `NODE_ENV=production` or `WEBSITE_SITE_NAME` is set

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| App won’t start | Check Log stream; verify `DATABASE_URL`, `PORT` |
| `DATABASE_URL` missing / empty | App Service → Environment variables: set non-empty `DATABASE_URL`; or add GitHub secret for CI |
| Prisma migrate fails | Firewall, `sslmode=require`, credentials, empty App Setting value |
| Upload fails | `STORAGE_PROVIDER=azure`, connection string, container exists |
| Zapier image error | `APP_PUBLIC_URL` HTTPS; blob public read; re-run **Optimize for Instagram** |
| 502 Bad Gateway | Startup command, Node 20, build succeeded |

---

## Related docs

- [README.md](./README.md) — local development
- [docs/DATABASE.md](./docs/DATABASE.md) — PostgreSQL on macOS
