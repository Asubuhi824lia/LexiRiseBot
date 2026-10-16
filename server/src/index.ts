import { initDataPaths } from './config.ts'

await initDataPaths()
const { startServer } = await import('./app.ts')
startServer()
