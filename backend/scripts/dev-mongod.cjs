// One-off local dev helper, not part of the test suite or production build:
// starts an in-memory MongoDB and writes its connection string into
// backend/.env (gitignored) so `npm run dev` (ts-node-dev) picks it up on
// next start, purely so authenticated pages can be exercised in a browser
// during a UI redesign QA pass. Never used in CI or by scripts/run-tests.js
// (which manages its own in-memory mongod per test run).
const { MongoMemoryServer } = require("mongodb-memory-server")
const fs = require("fs")
const path = require("path")

async function main() {
  const mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri("transitswap")
  const envPath = path.join(__dirname, "..", ".env")
  const envContent = `PORT=5000\nMONGODB_URI=${uri}\nJWT_SECRET=dev_only_local_secret\nFRONTEND_URL=http://localhost:5173\n`
  fs.writeFileSync(envPath, envContent)
  console.log("MONGODB_URI written to backend/.env:", uri)
  console.log("Keep this process running; press Ctrl+C to stop the in-memory mongod.")
  // Keep process alive
  await new Promise(() => {})
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
