import * as Middleware from '#middleware'
import * as Validation from '#validations'

import { Guild, User } from 'discord.js'
import { TrackedDecision, TrackedDecisionOption } from '#objects/decision'
import { WebRoute, WebRouted } from '#/router/web-router'

import { ObjectId } from 'bson'
import { badRequestError } from '../../errors'
import { validate } from '#validations'

export const Routes: Array<WebRoute> = [
  {
    controller: getDecision,
    method: 'post',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-as-owner',
    path: '/api/decision'
  },
  {
    controller: getDecisions,
    method: 'get',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decisions-as-owner',
    path: '/api/decisions'
  },
  {
    controller: updateDecision,
    method: 'patch',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-update-props',
    path: '/api/decision/props'
  },
  {
    controller: addDecisionOutcome,
    method: 'put',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-new-outcome',
    path: '/api/decision/outcome'
  },
  {
    controller: updateDecisionOutcome,
    method: 'patch',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-update-outcome',
    path: '/api/decision/outcome'
  },
  {
    controller: deleteDecisionOutcome,
    method: 'delete',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-new-outcome',
    path: '/api/decision/outcome'
  },
  {
    controller: addDecision,
    method: 'put',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-new',
    path: '/api/decision'
  },
  {
    controller: deleteDecision,
    method: 'delete',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-delete',
    path: '/api/decision'
  },
  {
    controller: resetConsumed,
    method: 'patch',
    middleware: [Middleware.Auth.validateSession],
    name: 'web-decision-reset-consume-mode',
    path: '/api/decision/consumedReset'
  }
]

export async function getDecision(routed: WebRouted) {
  const v = await validate(Validation.Decisions.getDecision(), routed.req.body)
  if (v.valid) {
    const decision = await routed.DB.get('decision', {
      $or: [{ authorID: routed.session.userID }, { managers: { $in: [routed.session.userID] } }],
      _id: new ObjectId(v.o._id)
    })

    if (decision) {
      try {
        const logLookup: Array<TrackedDecision> = await routed.DB.aggregate('decision', [
          {
            $match: {
              $or: [{ authorID: routed.session.userID }, { managers: { $in: [routed.session.userID] } }],
              _id: new ObjectId(v.o._id)
            }
          },
          { $project: { _id: { $toString: '$_id' }, name: 1, options: 1 } },
          {
            $lookup: {
              as: 'log',
              foreignField: 'decisionID',
              from: 'decision-log',
              localField: '_id'
            }
          },
          { $unwind: '$log' },
          { $sort: { 'log._id': -1 } },
          { $limit: 20 },
          {
            $group: { _id: '$_id', log: { $push: '$log' }, name: { $first: '$name' }, options: { $first: '$options' } }
          },
          {
            $project: {
              _id: 1,
              log: 1,
              name: 1,
              options: 1
            }
          }
        ])

        // Add to decision
        decision.log = logLookup[0].log

        // Map Names
        decision.log = decision.log.map((d) => {
          d._id = new Date(parseInt(String(d._id).substring(0, 8), 16) * 1000).toUTCString()
          let guild = null as Guild
          let caller = null as User

          try {
            // guild = routed.Bot.client.guilds.cache.get(d.serverID)
            // // channel = routed.Bot.client.channels.find(c => c.id !== d.channelID)
            // caller = routed.Bot.client.users.cache.find((u) => u.id === d.callerID)

            // d.serverID = guild.name
            // // d.channelID = channel.
            // d.callerID = `${caller.username}#${caller.discriminator}`
          } catch (error) {}

          return d
        })
      } catch (error) {
        console.log('No decision log to lookup or add')
      }

      // Lookup usage count to append
      const used = await routed.DB.count('decision-log', { decisionID: decision._id.toHexString() })
      decision.counter = used

      return routed.res.send({ data: new TrackedDecision(decision), status: 'fetchedOne', success: true })
    }
    return routed.res.send({ status: 'failed', success: false })
  }

  return routed.next(badRequestError(routed))
}

export async function getDecisions(routed: WebRouted) {
  const decisions = await routed.DB.getMultiple('decision', {
    $or: [{ authorID: routed.session.userID }, { managers: { $in: [routed.session.userID] } }]
  })

  if (decisions.length) {
    return routed.res.send(decisions.map((d) => new TrackedDecision(d)))
  }

  return routed.next(badRequestError(routed))
}

export async function deleteDecision(routed: WebRouted) {
  const v = await validate(Validation.Decisions.deleteDecision(), routed.req.body)

  if (v.valid) {
    const deleteCount = await routed.DB.remove('decision', {
      _id: new ObjectId(v.o._id),
      authorID: routed.session.userID
    })

    if (deleteCount > 0) return routed.res.send({ status: 'deleted', success: true })
    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}

export async function updateDecisionOutcome(routed: WebRouted) {
  const v = await validate(Validation.Decisions.updateDecisionOutcome(), routed.req.body)

  if (v.valid) {
    const updateCount = await routed.DB.update(
      'decision',
      { $or: [{ authorID: routed.session.userID }, { managers: { $in: [routed.session.userID] } }], 'options._id': new ObjectId(v.o._id) },
      {
        $set: {
          'options.$.text': v.o.text,
          'options.$.type': v.o.type
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

export async function updateDecisionConsumeReset(routed: WebRouted) {
  const v = await validate(Validation.Decisions.updateConsumeReset(), routed.req.body)

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
      { $set: { consumeReset: Number(v.o.consumeReset) } },
      { atomic: true }
    )

    if (updateCount > 0) return routed.res.send({ status: 'updated', success: true })
    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}

export async function deleteDecisionOutcome(routed: WebRouted) {
  const v = await validate(Validation.Decisions.deleteOutcome(), routed.req.body)

  if (v.valid) {
    const deleteCount = await routed.DB.update(
      'decision',
      { $or: [{ authorID: routed.session.userID }, { managers: { $in: [routed.session.userID] } }], 'options._id': new ObjectId(v.o._id) },
      { $pull: { options: { _id: new ObjectId(v.o._id) } } },
      { atomic: true }
    )

    if (deleteCount > 0) return routed.res.send({ status: 'deleted', success: true })
    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}

export async function addDecisionOutcome(routed: WebRouted) {
  const v = await validate(Validation.Decisions.addOutcome(), routed.req.body)

  if (v.valid) {
    const newDecisionOutcome = new TrackedDecisionOption({ text: v.o.text, type: v.o.type })

    const addOutcome = await routed.DB.update(
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
      { $push: { options: newDecisionOutcome } },
      { atomic: true }
    )

    if (addOutcome > 0)
      return routed.res.send({
        data: newDecisionOutcome,
        status: 'added',
        success: true
      })
    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}

export async function addDecision(routed: WebRouted) {
  const v = await validate(Validation.Decisions.addDecision(), routed.req.body)

  if (v.valid) {
    const newDeicison = new TrackedDecision({
      authorID: routed.session.userID,
      name: v.o.name,
      serverID: '473856867768991744'
    })
    const decisionId = await routed.DB.add('decision', newDeicison)

    if (decisionId) {
      return routed.res.send({
        id: decisionId,
        status: 'added',
        success: true
      })
    }

    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}

export async function resetConsumed(routed: WebRouted) {
  const v = await validate(Validation.Decisions.resetConsumed(), routed.req.body)

  if (v.valid) {
    // Reset all options consumed properties
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
        _id: new ObjectId(v.o._id),
        'options.consumed': true
      },
      { $set: { 'options.$[].consumed': false, 'options.$[].consumedTime': 0 } },
      { atomic: true }
    )

    if (updateCount > 0) return routed.res.send({ status: 'updated', success: true })
    return routed.res.send({ status: 'failed', success: false })
  }

  // On error
  return routed.next(badRequestError(routed))
}
