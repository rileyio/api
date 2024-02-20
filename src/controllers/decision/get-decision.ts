import * as Validation from '#validations'

import { Guild, User } from 'discord.js'

import { ObjectId } from 'bson'
import { TrackedDecision } from '#/common/objects/decision.js'
import { WebRouted } from '#/router/index.js'
import { badRequestError } from '#/errors.js'
import { validate } from '#/validations/validate.js'

export async function getDecision(routed: WebRouted) {
  console.log('routed.req.body', routed.req.body)
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
