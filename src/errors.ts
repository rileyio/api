import { WebRouted } from './web-router.ts'

export function badRequestError(routed: WebRouted, customMessage?: string) {
  routed.res.status(400).json({
    message: customMessage || 'Bad Request',
    status: 400,
    successful: false
  })
}
