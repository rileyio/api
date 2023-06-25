import * as SocketIO from 'socket.io'
import * as SocketStats from '#api/socket/stats'
import * as http from 'http'

import { WebRoute, WebRouter } from '#api/web-router'

import bodyParser from 'body-parser'
import express from 'express'
import { webRouteLoader } from '#api/router/route-loader'
import { MongoDB } from './db/database.ts'

export class WebAPI {
  protected readonly port: number = Number(process.env.API_PORT || 8234)
  protected readonly prefix: string = '/api'
  protected DB: MongoDB
  protected express: express.Application
  protected server: http.Server
  protected socket: SocketIO.Server
  protected router: WebRouter
  public configuredRoutes: Array<WebRoute> = []

  constructor() {
    // Prepare DB
    this.DB = new MongoDB()

    // Start Express server
    this.express = express()

    // Setup SocketIO
    const httpServer = http.createServer(this.server)

    // API config
    this.express.use(bodyParser.json())
    // this.server.use(restify.plugins.queryParser())
    // this.server.use(restify.plugins.bodyParser({ mapParams: true }))

    // Setup SocketIO
    this.socket = new SocketIO.Server(httpServer, {
      cors: {
        origin: '*'
      }
    })
    this.socket.on('connection', () => {
      this.Bot.Log.API.verbose('socket connection')
      // socket.emit('news', { hello: 'world' });
      // socket.on('my other event', (data) => {
      //   this.DEBUG_WEBAPI(data);
      // });
      SocketStats.heartBeat(this.Bot, this.socket)
    })
    this.socket.on('disconnect', () => {
      this.Bot.Log.API.verbose('socket disconnect')
    })

    // Emit Stats (Loop)
    SocketStats.stats(this.Bot, this.socket)
  }

  public async start() {
    try {
      // Setup routes
      this.configuredRoutes = await webRouteLoader()
      // this.configuredRoutes.forEach(r => console.log(`api route:: [${r.method}] ${r.path}`))
      this.router = new WebRouter(this.Bot, this.express, this.configuredRoutes)

      return new Promise<boolean>((r) => {
        this.server = this.server.listen(this.port, () => {
          this.Bot.Log.API.debug(`API listening at ${this.port}`)
          r(true)
        })
      })
    } catch (error) {
      this.Bot.Log.API.error(`API listening error.. unable to complete startup`, error.message)
      return false
    }
  }

  public async close() {
    try {
      return new Promise<boolean>((r) => {
        this.server.close(() => {
          this.Bot.Log.API.debug(`stopping WebAPI...`)
          r(true)
        })
      })
    } catch (error) {
      this.Bot.Log.API.debug(`error stopping the WebAPI`)
      return false
    }
  }
}
