import * as Path from 'path'

import { WebRoute } from '#/router/web-router'
import { Logger } from '#utils'
import glob from 'fast-glob'

export async function webRouteLoader(logger: Logger.Debug) {
  // Load routes from commands folder
  const _routeFiles = glob.sync(['src/controllers/**/*', '!src/controllers/**/index'], { deep: 5 })

  // Collection of routes
  const routes: Array<WebRoute> = []

  // Load each route configured into the routes array
  for (let index = 0; index < _routeFiles.length; index++) {
    const routeFile = _routeFiles[index]

    // Wrapped in a try to make more safe when loading and errors are present
    try {
      const _requiredFile = (await import(Path.join('../../', routeFile.toString()))) as { Routes: Array<WebRoute> }
      // Test if file returns undefined
      if (_requiredFile !== undefined) {
        logger.log(`webRouteLoader() => ${routeFile.toString()}, ${_requiredFile.Routes.map((r) => Array.isArray(r)).length}`)

        for (let index = 0; index < _requiredFile.Routes.length; index++) {
          const route = _requiredFile.Routes[index]
          routes.push(route)
        }
      }
    } catch (e) {
      logger.error(`webRouteLoader() [ERROR] => ${routeFile.toString()}, ${e.message}`)
    }
  }

  // console.log(`webRouteLoader() => routes loaded: ${routes.length}`)

  return routes
}
