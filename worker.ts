/// <reference types="@cloudflare/workers-types" />
import { onRequest } from './functions/api/[[route]]'

interface Ctx {
  waitUntil: (promesa: Promise<unknown>) => void
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: Ctx): Promise<Response> {
    const contexto = {
      request,
      env,
      params: {},
      data: {},
      waitUntil: (promesa: Promise<unknown>) => ctx.waitUntil(promesa),
      next: () => Promise.resolve(new Response(null, { status: 404 })),
    }
    return onRequest(contexto as never)
  },
} as ExportedHandler<Record<string, unknown>>
