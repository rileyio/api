import { WebRoute, WebRouted } from '#/router/web-router'

export const Routes: Array<WebRoute> = [
  {
    controller: getAll,
    method: 'get',
    name: 'stats-get-all',
    path: '/api/stats'
  }
]

export async function getAll(routed: WebRouted) {
  return routed.res.json(await routed.DB.get('stats-bot', {}))
}
