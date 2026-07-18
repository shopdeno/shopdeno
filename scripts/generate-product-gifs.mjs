/**
 * Generate one looping GIF per multi-image product, stored as a static asset in
 * public/product-gifs/{productId}.gif. ProductCard shows the GIF on hover only,
 * so variation frames are served straight from /public and never hit Next.js
 * Image Optimization (avoids per-frame transform cache writes on Vercel).
 *
 * Standalone ESM script — talks to Saleor via plain fetch (no @/ alias / urql /
 * TS, which plain `node` cannot resolve). Run:
 *
 *   npm run generate-gifs            # uses --env-file=.env (prod Cloud endpoint)
 *
 * The GIF filename is the Saleor global product id, which is identical whichever
 * endpoint you query as long as it is the same DB — so generate against the same
 * Saleor instance prod uses (store-*.saleor.cloud) so ids match ProductCard.
 */
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const SALEOR_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL;
const CHANNEL = process.env.NEXT_PUBLIC_SALEOR_CHANNEL || 'default-channel';

if (!SALEOR_URL) {
  console.error('NEXT_PUBLIC_SALEOR_API_URL is not set (run via `npm run generate-gifs`).');
  process.exit(1);
}

const GIF_DIR = join(process.cwd(), 'public', 'product-gifs');
const MAX_FRAMES = 5;

// Minimal storefront query: id + media urls + variant media urls, paged.
const PRODUCTS_QUERY = /* GraphQL */ `
  query GifProducts($channel: String!, $first: Int!, $after: String, $sortBy: ProductOrder) {
    products(channel: $channel, first: $first, after: $after, sortBy: $sortBy) {
      edges {
        node {
          id
          media { url }
          variants { media { url } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function gql(query, variables) {
  const res = await fetch(SALEOR_URL, {
    method: 'POST', // Saleor serves GraphiQL HTML on GET — must POST
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error('GQL error: ' + JSON.stringify(json.errors));
  return json.data;
}

async function main() {
  console.log(`Generating product GIFs from ${SALEOR_URL} (channel: ${CHANNEL})`);
  mkdirSync(GIF_DIR, { recursive: true });

  let hasNextPage = true;
  let after = null;
  const counts = { made: 0, single: 0, failed: 0 };

  while (hasNextPage) {
    const data = await gql(PRODUCTS_QUERY, {
      channel: CHANNEL,
      first: 100,
      after,
      // sortBy MUST be a ProductOrder object, not a bare string (Saleor gotcha)
      sortBy: { field: 'PUBLICATION_DATE', direction: 'DESC' },
    });

    const products = data?.products;
    for (const edge of products?.edges ?? []) {
      const result = await processProduct(edge.node);
      counts[result]++;
    }

    hasNextPage = products?.pageInfo?.hasNextPage ?? false;
    after = products?.pageInfo?.endCursor ?? null;
  }

  console.log(
    `\nDone. Generated ${counts.made} GIF(s), skipped ${counts.single} single-image, ` +
    `${counts.failed} failed → ${GIF_DIR}`
  );
  if (counts.failed) process.exitCode = 1;
}

// Map a response content-type to a filesystem extension ffmpeg can key off.
function extFromContentType(ct) {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('avif')) return 'avif';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

async function processProduct(product) {
  const { id, media, variants } = product;

  // Unique image urls: prefer variant media, include product media.
  const urls = new Set();
  for (const m of media ?? []) if (m?.url) urls.add(m.url);
  for (const v of variants ?? []) for (const m of v?.media ?? []) if (m?.url) urls.add(m.url);

  if (urls.size < 2) return 'single'; // need ≥2 frames for a meaningful loop

  const imageUrls = Array.from(urls).slice(0, MAX_FRAMES);
  // Sanitize the global id for a filesystem-safe name (it may contain '=').
  const safeId = id.replace(/[^A-Za-z0-9_-]/g, '_');
  const tempDir = join(tmpdir(), 'product-gifs', safeId);
  mkdirSync(tempDir, { recursive: true });

  try {
    console.log(`Product ${id}: downloading ${imageUrls.length} frames...`);
    for (let i = 0; i < imageUrls.length; i++) {
      const res = await fetch(imageUrls[i]);
      if (!res.ok) throw new Error(`Failed to fetch ${imageUrls[i]}: ${res.status}`);
      const ext = extFromContentType(res.headers.get('content-type'));
      const buffer = Buffer.from(await res.arrayBuffer());
      // Save each source with its true extension, then normalize to a uniform
      // PNG so the assembly pass' image2 `%d.png` demuxer always matches.
      const rawPath = join(tempDir, `raw_${i + 1}.${ext}`);
      await writeFileBuffer(rawPath, buffer);
      await runFfmpeg(['-i', rawPath, '-y', join(tempDir, `${i + 1}.png`)]);
    }

    const gifPath = join(GIF_DIR, `${id}.gif`);

    // Single pass with palettegen embedded (simpler, more stable than paletteuse)
    await runFfmpeg([
      '-framerate', '1',
      '-i', join(tempDir, '%d.png'),
      '-vf', 'scale=400:400:force_original_aspect_ratio=decrease,pad=400:400:(ow-iw)/2:(oh-ih)/2,split[x][z];[z]palettegen=max_colors=128[p];[x][p]paletteuse',
      '-loop', '0',
      '-y',
      gifPath,
    ]);
    console.log(`Product ${id}: GIF -> ${gifPath}`);
    return 'made';
  } catch (err) {
    console.error(`Error processing product ${id}:`, err.message);
    return 'failed';
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

function writeFileBuffer(filePath, buffer) {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    stream.write(buffer);
    stream.end();
  });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    ffmpeg.stderr.on('data', (d) => { stderr += d.toString(); });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code !== 0) reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
      else resolve();
    });
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
