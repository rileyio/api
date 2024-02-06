import * as Validation from '#validations'

import { WebRoute, WebRouted } from '#router'

import { badRequestError } from '../errors'

export const Routes: Array<WebRoute> = [
  // * Lists **/
  {
    controller: get,
    method: 'post',
    name: 'lists-get',
    path: '/api/lists'
  }
]

export async function get(routed: WebRouted) {
  const v = await Validation.validate(Validation.Lists.get(), routed.req.body)
  const payload = {
    servers: [],
    users: []
  }

  // this.DEBUG_WEBAPI('req params', v.o)

  if (v.valid) {
    const users = await routed.DB.getMultiple(
      'users',
      {
        username: { $options: 'i', $regex: new RegExp(`^${v.o.input}`) }
      },
      { discriminator: 1, username: 1 }
    )
    const servers = await routed.DB.getMultiple(
      'servers',
      {
        name: { $options: 'i', $regex: new RegExp(`^${v.o.input}`) }
      },
      { name: 1, ownerID: 1, region: 1 }
    )

    payload.servers = servers
    payload.users = users

    return routed.res.send(payload)
  }

  // On error
  return routed.next(badRequestError(routed))
}
