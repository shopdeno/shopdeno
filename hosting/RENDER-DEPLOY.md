# Deploy Saleor API to Render free (no card)

Two free web services (Frankfurt), sharing the 750h/month pool — both sleep
when idle, so low traffic stays free:
- `shopdeno-saleor-api` — uvicorn only (migrate on boot)
- `shopdeno-saleor-worker` — celery worker + beat + tiny keepalive HTTP.
  Generates thumbnails, sends mail, runs scheduled tasks.

## 1. Render account
Sign up at https://dashboard.render.com (free, no card). One workspace is fine.

## 2. Blueprint deploy
1. Dashboard -> New -> **Blueprint** -> connect GitHub `shopdeno/shopdeno`
   (repo must contain `render.yaml` at root, branch `main`).
2. Name the Blueprint e.g. `shopdeno-saleor`. Review the single service
   `shopdeno-saleor-api` (Docker, Frankfurt, free).
3. Fill every prompted secret from `hosting/.env.selfhosted`:
   - `SECRET_KEY`, `DATABASE_URL` (**direct/unpooled** Neon string, not the
     `-pooler` one), `REDIS_URL`, `ALLOWED_HOSTS`,
     `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
     `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` (Brevo).
   - `ALLOWED_HOSTS` = the Render hostname, e.g.
     `shopdeno-saleor-api.onrender.com` (no scheme). Add a custom domain
     later if wanted — it also goes here, comma-separated.
4. Apply. First build pulls `ghcr.io/saleor/saleor:3.23` (~5-10 min on
   0.1 CPU). Boot runs `migrate --noinput`, then API + worker + beat.

## 3. Verify
- Logs show `Application startup complete` three times (api/worker/beat).
- `GET https://<service>.onrender.com/graphql/` returns the GraphiQL HTML
  page (status 200 = healthy).
- POST a `{ shop { name } }` query — expect JSON.

## 4. Staff superuser
Created ahead of time against Neon (see checklist step C) — log into the
dashboard below with it. If missing, re-run the local createsuperuser
command from the checklist.

## 5. Dashboard (staff UI)
Render free has no shell and no second always-on service budget, so run the
dashboard **locally** when needed:
`docker run -p 9000:80 -e API_URI=https://<service>.onrender.com/graphql/ -e APP_MOUNT_URI=/ ghcr.io/saleor/saleor-dashboard:latest`
then open http://localhost:9000. Stop it when done.

## Free-tier realities
- Sleeps after 15 min idle; ~1 min cold start. Storefront shell still
  renders; products pop in after wake.
- 750 instance-hours/month = one always-on service fits.
- Ephemeral disk: uploads live in Supabase bucket, not on disk — nothing
  to lose on restart.
- No shell access: all admin work via dashboard-in-docker or GraphQL.
