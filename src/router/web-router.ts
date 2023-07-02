import { Logger } from '#utils'
import { MongoDB } from '#db'
import * as express from 'express'
import { WebAPI } from '../index.ts'

export interface WebRoute {
  // eslint-disable-next-line @typescript-eslint/ban-types
  controller: Function | void
  method: 'get' | 'post' | 'delete' | 'put' | 'patch'
  middleware?: Array<(routed: WebRouted) => Promise<WebRouted | void>>
  name: string
  path: string
}

export class WebRouted {
  public DB: MongoDB
  public route: WebRoute
  public logger: Logger.Debug
  public controller: (routed: WebRouted) => Promise<boolean>
  // Express args
  public req: express.Request
  public res: express.Response
  public next: express.NextFunction
  public session: { id: string; userID?: string }

  constructor(init: Partial<WebRouted>) {
    this.DB = init.DB
    this.logger = init.logger
    this.next = init.next
    this.route = init.route
    this.req = init.req
    this.res = init.res
    this.route = init.route
    // this.session = init.req.session
  }
}

export class WebRouter {
  protected validMethods = ['get', 'post', 'delete', 'put', 'patch']
  public API: WebAPI
  public logger: Logger.Debug
  public server: express.Application
  public routes: Array<WebRoute> = []

  constructor(api: WebAPI, server: express.Application, routes: Array<WebRoute>) {
    this.API = api
    this.server = server
    this.routes = routes
    this.logger = api.logger

    this.logger.verbose(`Routes found: ${this.routes.length}`)

    for (let index = 0; index < this.routes.length; index++) {
      const route = this.routes[index]

      // Check if this is a valid route method recognized by the API
      if (!this.validMethods.includes(route.method)) {
        this.logger.error(`Router -> [${route.path}] WebRoute method [${route.method}] is invalid`)
        continue
      }

      this.logger.verbose(`🚏 <${route.method}> [${route.path}] WebRoute loaded`)
      this.server[route.method](route.path, async (req, res, next) => middlewareHandler(this.createRouted(req, res, next, route)))
    }
  }

  private createRouted(req: express.Request, res: express.Response, next: express.NextFunction, route: WebRoute) {
    return new WebRouted({
      DB: this.API.DB,
      logger: this.API.logger,
      next: next,
      req: req,
      res: res,
      route: route
    })
  }
}

export async function middlewareHandler(routed: WebRouted) {
  // Process middleware
  const mwareCount = Array.isArray(routed.route.middleware) ? routed.route.middleware.length : 0
  let mwareProcessed = 0

  for (const middleware of routed.route.middleware || []) {
    const fromMiddleware = await middleware(routed)
    // If the returned item is empty stop here
    if (!fromMiddleware) {
      break
    }
    // When everything is ok, continue
    mwareProcessed += 1
  }

  routed.logger.log(`Router -> [${routed.route.path}] WebRoute middleware processed: ${mwareProcessed}/${mwareCount}`)

  // Stop execution of route if middleware is halted
  if (mwareProcessed === mwareCount) {
    // Check status returns later for stats tracking
    await (<any>routed.route).controller(routed)
    return // End routing here
  }
}
