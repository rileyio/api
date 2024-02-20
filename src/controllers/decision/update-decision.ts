import * as Validation from '#validations'

import { ObjectId } from 'bson'
import { WebRouted } from '#/router/index.js'
import { badRequestError } from '#/errors.js'
import { validate } from '#/validations/validate.js'

export async function updateDecision(routed: WebRouted) {
  const v = await validate(Validation.Decisions.updateProps(), routed.req.body)

  if (v.valid) {
    const updateCount = await routed.DB.update(
      'decision',
      {
        $or: [
          {
            authorID: routed.session.userID
          },
          {
            managers: {
              $in: [routed.session.userID]
            }
          }
        ],
        _id: new ObjectId(v.o._id)
      },
      {
        $set: {
          consumeMode: v.o.consumeMode,
          consumeReset: v.o.consumeReset,
          description: v.o.description || '',
          enabled: v.o.enabled,
          name: v.o.name,
          serverWhitelist: v.o.serverWhitelist || '',
          userBlacklist: v.o.userBlacklist || '',
          userWhitelist: v.o.userWhitelist || ''
        }
      },
      { atomic: true }
    )

    if (updateCount > 0) return routed.res.send({ status: 'updated', success: true })
    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}
