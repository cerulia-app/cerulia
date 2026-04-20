import { createApiApp } from '../app.js'
import { resolveHeaderAuthContext } from '../auth.js'
import { createD1Store, type D1DatabaseLike } from '../store/d1.js'

interface WorkerEnv {
  DB: D1DatabaseLike
}

let appPromise: Promise<ReturnType<typeof createApiApp>> | undefined

async function getApp(env: WorkerEnv) {
  appPromise ??= (async () => {
    const store = createD1Store(env.DB)
    return createApiApp({
      store,
      authResolver: resolveHeaderAuthContext,
    })
  })()

  return appPromise
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = await getApp(env)
    return app.fetch(request, env)
  },
}