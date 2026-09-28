/**
 * server/index.js
 * Cloudflare Workers entry point (used by wrangler.jsonc).
 * For local development, run server/local.js instead.
 */

import { httpServerHandler } from 'cloudflare:node'
import app from './app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`)
})

export default httpServerHandler({ port: PORT })
