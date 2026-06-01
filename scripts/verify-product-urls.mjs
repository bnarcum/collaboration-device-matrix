#!/usr/bin/env node
/**
 * Verifies DEVICE_PRODUCT_URLS respond with HTTP 200 and no "sorry / not found" copy.
 * Webex marketing pages may return 403 to scripts — those are listed as SKIPPED, not FAIL.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source = readFileSync(
  join(root, 'src/data/deviceProductUrls.ts'),
  'utf8',
)

const entries = [
  ...source.matchAll(/^\s+'([^']+)':\s*'([^']+)'/gm),
  ...source.matchAll(/^\s+([a-z][a-z0-9-]*):\s*'([^']+)'/gm),
].map(([, id, url]) => ({ id, url }))

const unique = new Map(entries.map((e) => [e.id, e]))
const urls = [...unique.values()]

if (urls.length === 0) {
  console.error('No product URLs found in deviceProductUrls.ts')
  process.exit(1)
}

const BAD_BODY =
  /page not found|404 - page not found|cannot be found|error 404|>404<|we couldn't find|page you requested/i
const BAD_TITLE = /page not found|404|not found/i
const WEBEX_HOST = /^https:\/\/www\.webex\.com\//i

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function checkOnce({ id, url }) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(20_000),
  })
  const body = await res.text()
  const title = body.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''

  if (res.status === 403 && WEBEX_HOST.test(url)) {
    return { id, url, status: 'skip', detail: '403 (Webex bot guard — verify in browser)' }
  }
  if (res.status === 429 || res.status >= 500) {
    return { id, url, status: 'skip', detail: `HTTP ${res.status} (transient)` }
  }
  if (res.status !== 200) {
    return { id, url, status: 'fail', detail: `HTTP ${res.status}` }
  }
  if (BAD_BODY.test(body) || BAD_TITLE.test(title)) {
    return { id, url, status: 'fail', detail: `Bad content in page (${title.slice(0, 60)})` }
  }
  return { id, url, status: 'ok', detail: title.slice(0, 70) }
}

async function check(entry) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await checkOnce(entry)
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800))
        continue
      }
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ...entry,
        status: 'skip',
        detail: `Network (${msg}) — verify in browser`,
      }
    }
  }
  return { ...entry, status: 'skip', detail: 'Network — verify in browser' }
}

const results = []
for (const entry of urls) {
  results.push(await check(entry))
}

let fails = 0
let skips = 0
for (const r of results) {
  const tag = r.status === 'ok' ? 'OK' : r.status === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`${tag}\t${r.id}\t${r.detail}`)
  if (r.status === 'fail') {
    fails++
    console.log(`      ${r.url}`)
  }
  if (r.status === 'skip') skips++
}

console.log(
  `\n${results.length} URLs — ${results.length - fails - skips} ok, ${skips} skipped, ${fails} failed`,
)
process.exit(fails > 0 ? 1 : 0)
