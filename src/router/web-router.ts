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
      this.logger.verbose(`Router -> [${route.path}] WebRoute loaded`)

      if (route.method === 'get') {
        this.server.get(route.path, async (req, res, next) =>
          middlewareHandler(
            new WebRouted({
              DB: this.API.DB,
              logger: this.API.logger,
              next: next,
              req: req,
              res: res,
              route: route
            })
          )
        )
      }
      if (route.method === 'post') {
        this.server.post(route.path, async (req, res, next) =>
          middlewareHandler(
            new WebRouted({
              DB: this.API.DB,
              logger: this.API.logger,
              next: next,
              req: req,
              res: res,
              route: route
            })
          )
        )
      }
      if (route.method === 'delete') {
        this.server.delete(route.path, async (req, res, next) =>
          middlewareHandler(
            new WebRouted({
              DB: this.API.DB,
              logger: this.API.logger,
              next: next,
              req: req,
              res: res,
              route: route
            })
          )
        )
      }
      if (route.method === 'patch') {
        this.server.patch(route.path, async (req, res, next) =>
          middlewareHandler(
            new WebRouted({
              DB: this.API.DB,
              logger: this.API.logger,
              next: next,
              req: req,
              res: res,
              route: route
            })
          )
        )
      }
      if (route.method === 'put') {
        this.server.put(route.path, async (req, res, next) =>
          middlewareHandler(
            new WebRouted({
              DB: this.API.DB,
              logger: this.API.logger,
              next: next,
              req: req,
              res: res,
              route: route
            })
          )
        )
      }
    }
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
