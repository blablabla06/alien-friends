/**
 * server/local.js
 * Local development entry point — runs the same app with plain Node.
 * Reads DEEPSEEK_API_KEY from .env in the project root.
 */

import app from './app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`)
  console.log(`[server] Health: http://localhost:${PORT}/api/health`)
})
