import { WebRoute, WebRouted } from '#/web-router'

export const Routes: Array<WebRoute> = [
  {
    controller: getAll,
    method: 'get',
    name: 'stats-get-all',
    path: '/api/stats'
  }
]

export async function getAll(routed: WebRouted) {
  return routed.res.json(routed.Bot.BotMonitor.LiveStatistics.BotStatistics)
}
