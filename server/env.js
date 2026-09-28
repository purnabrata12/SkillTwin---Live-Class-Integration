import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Always load THIS project's server/.env, even when npm is started from the
// repository root or Windows already has stale LIVEKIT_* environment values.
// Local server/.env intentionally wins for this development project.
dotenv.config({ path: path.join(__dirname, '.env'), override: true })
