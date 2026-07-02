# Saleor Storefront Setup Guide

## Development Workflow

### Option 1: Local Development with Docker

1. **Start Saleor locally:**
   ```bash
   docker-compose up -d
   ```

2. **Configure environment:**
   ```bash
   cp .env.local .env
   ```

3. **Access Saleor Dashboard:**
   - URL: http://localhost:8000/dashboard/
   - Create admin account: http://localhost:8000/dashboard/registration/

4. **Run Next.js:**
   ```bash
   npm run dev
   ```

5. **Create test data:**
   - Go to Dashboard → Products → Add Products
   - Go to Dashboard → Collections → Add Collections
   - Go to Dashboard → Configuration → Channels → Create channel

---

### Option 2: Production (Vercel + Klutch.sh)

1. **Deploy Saleor to Klutch.sh:**
   - Push your code to GitHub
   - Connect repo to Klutch.sh
   - Note your Klutch app URL

2. **Deploy Next.js to Vercel:**
   - Push code to GitHub
   - Connect repo to Vercel
   - Add environment variables from `.env.production`

3. **Update environment:**
   ```bash
   # Update .env.production with:
   NEXT_PUBLIC_SALEOR_API_URL=https://your-klutch-app-url/graphql/
   NEXT_PUBLIC_SALEOR_ADMIN_URL=https://your-klutch-app-url/dashboard/
   NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
   ```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SALEOR_API_URL` | Saleor GraphQL endpoint |
| `NEXT_PUBLIC_SALEOR_CHANNEL` | Channel slug (check Dashboard) |
| `NEXT_PUBLIC_SALEOR_ADMIN_URL` | Admin dashboard URL |
| `NEXT_PUBLIC_SITE_URL` | Your site URL for SEO |

## Finding Your Channel Slug

1. Go to Saleor Dashboard
2. Navigate to **Configuration** → **Channels**
3. Note the **Slug** column value (e.g., "default-channel", "us", "gb")

## Useful Commands

```bash
# Start Docker
docker-compose up -d

# View logs
docker-compose logs -f saleor

# Stop Docker
docker-compose down

# Rebuild
docker-compose up --build
```
