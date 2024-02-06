import * as Middleware from '../middleware/index'
import { WebRoute, WebRouted } from '../router/web-router'

export const Routes: Array<WebRoute> = [
  {
    controller: getEntries,
    method: 'post',
    middleware: [Middleware.Auth.validateSession],
    name: 'audit-log',
    path: '/api/audit-log'
  }
]

export async function getEntries(routed: WebRouted) {
  const auditEntries = await routed.DB.getLatest(
    'audit-log',
    {
      owner: routed.session.id
    },
    { limit: 200 }
  )

  console.log('Audit Count:', auditEntries.length)

  return routed.res.send(auditEntries)
}
