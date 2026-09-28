import './env.js'
import { LIVEKIT_URL, credentialHint, livekitConfigured, verifyLiveKitCredentials } from './livekit.js'

console.log(`Project URL: ${LIVEKIT_URL || '(not set)'}`)
console.log(`API key: ${credentialHint}`)
console.log(`Configured: ${livekitConfigured ? 'YES' : 'NO'}`)

const result = await verifyLiveKitCredentials(true)
if (result.ok) {
  console.log('RESULT: VALID - the server can authenticate with LiveKit Cloud.')
  process.exit(0)
}

console.error(`RESULT: INVALID - ${result.message}`)
process.exit(1)
