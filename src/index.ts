import * as SocketIO from 'socket.io'
// import * as SocketStats from '#/socket/stats'
import { Logger } from '#utils'
import * as http from 'http'

import { WebRoute, WebRouter } from './router/web-router.ts'

import { MongoDB } from '#db'
import bodyParser from 'body-parser'
import express from 'express'
import { webRouteLoader } from '#router'

export class WebAPI {
  protected readonly port: number = Number(process.env.API_PORT || 8234)
  protected readonly prefix: string = '/api'
  protected express: express.Application
  protected server: http.Server
  protected socket: SocketIO.Server
  protected router: WebRouter
  protected statsInterval: NodeJS.Timer
  public DB: MongoDB
  public configuredRoutes: Array<WebRoute> = []
  public logger = new Logger.Debug('API', { console: true })
  public publicStats: any = {}

  constructor() {
    this.DB = new MongoDB(this.logger)

    // Start Express server
    this.express = express()

    // Setup SocketIO
    this.server = http.createServer(this.server)

    // API config
    this.express.use(bodyParser.json())

    // Setup SocketIO
    this.socket = new SocketIO.Server(this.server, {
      cors: {
        origin: '*'
      }
    })
    this.socket.on('connection', () => {
      this.logger.verbose('socket connection')
      // socket.emit('news', { hello: 'world' });
      // socket.on('my other event', (data) => {
      //   this.DEBUG_WEBAPI(data);
      // });
      // SocketStats.heartBeat(this.Bot, this.socket)
    })
    this.socket.on('disconnect', () => {
      this.logger.verbose('socket disconnect')
    })

    // Setup Stats fetch interval to prevent spamming
    this.statsInterval = setInterval(async () => {
      this.publicStats = await this.DB.get('stats-bot', {}, undefined, { logging: false })
    }, 1000)

    // Emit Stats (Loop)
    // SocketStats.stats(this.Bot, this.socket)
  }

  public async start() {
    try {
      // Setup routes
      this.configuredRoutes = await webRouteLoader(this.logger)
      // this.configuredRoutes.forEach(r => console.log(`api route:: [${r.method}] ${r.path}`))
      this.router = new WebRouter(this, this.express, this.configuredRoutes)

      return new Promise<boolean>((r) => {
        this.express.listen(this.port, () => {
          this.logger.debug(`API listening at ${this.port}`)
          r(true)
        })
      })
    } catch (error) {
      this.logger.error(`API listening error.. unable to complete startup`, error.message)
      throw error
      return false
    }
  }

  public async close() {
    try {
      return new Promise<boolean>((r) => {
        this.server.close(() => {
          this.logger.debug(`stopping WebAPI...`)
          r(true)
        })
      })
    } catch (error) {
      this.logger.debug(`error stopping the WebAPI`)
      return false
    }
  }
}
