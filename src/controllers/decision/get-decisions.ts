import { TrackedDecision } from '#/common/objects/decision.js'
import { WebRouted } from '#/router/index.js'
import { badRequestError } from '#/errors.js'
import { User } from '#utils'

export async function getDecisions(routed: WebRouted) {
  const decisions = await routed.DB.getMultiple('decision', {
    $or: [{ authorID: routed.session.id }, { managers: { $in: [routed.session.id] } }]
  })

  if (decisions.length) {
    const decisionsPrepared: Array<TrackedDecision> = []

    // Prepare Decisions data
    for (const decision of decisions) {
      // Check Redis Cache/Get User's Avatar & Username
      const discordUser = await User.fetchDiscordUser(routed.Redis, decision.authorID)

      // Set Decision.managerOnly Flag
      decision.managerOnly = decision.authorID !== routed.session.id

      // Add to prepared Array for API response
      decisionsPrepared.push(new TrackedDecision(decision, discordUser))
    }

    return routed.res.send(decisionsPrepared)
  }

  return routed.next(badRequestError(routed))
}
