// Generate the Apple OAuth client secret JWT for Supabase.
//
// Why this exists:
//   Supabase's Apple provider takes a JWT as the "Secret Key" field, not
//   the raw .p8 private-key contents. The JWT is signed with the .p8 key
//   and contains your Team ID, Key ID, and Services ID. Apple accepts the
//   JWT for up to 6 months from `iat`; after that, Sign in with Apple
//   silently breaks for web users until you regenerate.
//
// How to use:
//   1. Make sure jsonwebtoken is installed (one time):
//        npm install -D jsonwebtoken
//   2. Drop your AuthKey_XXXXXXXXXX.p8 file in this scripts/ folder.
//      (.gitignore already excludes *.p8 — it won't be committed.)
//   3. Run, passing your Team ID via an environment variable:
//        APPLE_TEAM_ID=YOUR_TEAM_ID node scripts/generate-apple-jwt.mjs
//   4. Copy the JWT it prints, paste into Supabase → Auth → Providers
//      → Apple → Secret Key. Save.
//   5. Set a calendar reminder for ~5 months from today to regenerate.
//
// Why env vars instead of hardcoded constants:
//   The Team ID and Key ID don't belong in a committed file. Env vars
//   keep this script safe to push to git. The .p8 itself stays out
//   of git via the *.p8 entry in .gitignore.
//
// What's auto-detected (no input needed):
//   - The .p8 filename — finds the first *.p8 in this directory.
//   - The Key ID — extracted from the .p8 filename (the portion
//     between "AuthKey_" and ".p8").
//
// Security:
//   The .p8 file is your private key. Treat it with the same care as
//   a service-role key. Keep a safe copy outside the repo too (e.g.
//   ~/Documents/MyRecipe-Apple-Keys/) so you can restore it if the
//   working copy gets deleted.

import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TEAM_ID = process.env.APPLE_TEAM_ID
const SERVICES_ID = process.env.APPLE_SERVICES_ID || 'com.mycompanionapps.recipe.web'

if (!TEAM_ID) {
  console.error('\nMissing APPLE_TEAM_ID environment variable.\n')
  console.error('Run with:')
  console.error('  APPLE_TEAM_ID=YOUR_TEAM_ID node scripts/generate-apple-jwt.mjs\n')
  console.error('Your Team ID is the 10-character string in the upper-right')
  console.error('of the Apple Developer Portal (under your name).\n')
  process.exit(1)
}

// Find the .p8 file in this directory (auto-detection — no hardcoded
// filename needed because there's typically one .p8 per app).
const p8Files = fs.readdirSync(__dirname).filter(f => f.endsWith('.p8'))

if (p8Files.length === 0) {
  console.error('\nNo .p8 file found in scripts/ folder.\n')
  console.error('Drop your AuthKey_XXXXXXXXXX.p8 file next to this script and try again.\n')
  process.exit(1)
}

if (p8Files.length > 1) {
  console.error('\nMultiple .p8 files found in scripts/:')
  p8Files.forEach(f => console.error('  ' + f))
  console.error('\nKeep only one .p8 (the active Sign in with Apple key) and try again.\n')
  process.exit(1)
}

const p8Filename = p8Files[0]
const p8Path = path.join(__dirname, p8Filename)

// Extract Key ID from the filename (Apple's format is AuthKey_<KEY_ID>.p8).
const match = p8Filename.match(/^AuthKey_([A-Z0-9]+)\.p8$/i)
if (!match) {
  console.error(`\nCouldn't parse Key ID from filename: ${p8Filename}`)
  console.error('Expected format: AuthKey_XXXXXXXXXX.p8\n')
  process.exit(1)
}
const KEY_ID = match[1]

const privateKey = fs.readFileSync(p8Path, 'utf8')

const now = Math.floor(Date.now() / 1000)
const sixMonthsLater = now + (6 * 30 * 24 * 60 * 60)  // ~6 months in seconds (Apple's max)

const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: now,
    exp: sixMonthsLater,
    aud: 'https://appleid.apple.com',
    sub: SERVICES_ID,
  },
  privateKey,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: KEY_ID,
    },
  }
)

const expiresOn = new Date(sixMonthsLater * 1000).toISOString().slice(0, 10)

console.log('\n=== Apple OAuth Client Secret (JWT) ===')
console.log('Team ID:    ', TEAM_ID)
console.log('Key ID:     ', KEY_ID)
console.log('Services ID:', SERVICES_ID)
console.log('Expires:    ', expiresOn)
console.log()
console.log(token)
console.log()
console.log('=== Next steps ===')
console.log('1. Copy the JWT above (the long string starting with "ey").')
console.log('2. Paste into Supabase → Auth → Providers → Apple → Secret Key.')
console.log('3. Save.')
console.log(`4. Set a calendar reminder for ~${new Date(sixMonthsLater * 1000 - 14 * 86400 * 1000).toISOString().slice(0,10)} to regenerate.\n`)
