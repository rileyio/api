import { Secrets } from '#utils'
import { WebRouted } from '#router'
import jwt from 'jsonwebtoken';

export async function isAuthenticatedOwner(routed: WebRouted) {
  // User & Token from header
  const id = routed.req.header('id')
  const token = routed.req.header('webToken')
  const serverID = routed.req.params.serverID
  // Get user from db to verify token
  const user = await routed.DB.get('users', { guilds: { $elemMatch: { id: serverID, owner: true } }, id, webToken: token })
  // Invalid
  if (!user) {
    routed.res.status(401).send({ successful: false, error: 'Unauthorized' })
    return // FAIL
  }

  // Verify token
  try {
    // Verify token & payload
    const verify = jwt.verify(token, Secrets.read('BOT_OAUTH_SECRET'))
    return routed // PASS
  } catch (error) {
    routed.res.status(401).send({ successful: false, error: 'Unauthorized' })
    return // FAIL
  }
}

////////////////////////////////////////////
// Valid Session (>= 5.x)
////////////////////////////////////////////

export async function validateSession(routed: WebRouted) {
  const userID = routed.req.header('userID')
  const webToken = routed.req.header('webToken')
  console.log('userID:', userID)

  let verifiedSession: { id: string }

  // If missing, fail
  if (!userID || !webToken) {
    console.log('ValidateSession => session information missing')
    routed.res.status(401).send({ successful: false, error: 'Unauthorized' })
    return // FAIL
  }

  // Verify session
  try {
    // Verify session & payload
    verifiedSession = jwt.verify(webToken, Secrets.read('BOT_OAUTH_SECRET')) as typeof verifiedSession
    console.log('ValidateSession => verifiedSession:', verifiedSession)
  } catch (error) {
    console.log('ValidateSession => Session not valid!', error)
    routed.res.status(401).send({ successful: false, error: 'Unauthorized' })
    return // FAIL
  }

  // Lookup Session in users collection
  const storedSession = await routed.DB.get('users', {
    id: userID,
    webToken
  })

  // If session user is found but has been terminated
  // if (storedSession) return routed.res.status(401).send({successful: false, error: 'Unauthorized'})

  // If valid record is found, return successful
  if (storedSession) {
    // Pass along some session data to help easing future lookups
    routed.session = verifiedSession
    return routed
  }

  // Fallback - fail auth
  console.log('ValidateSession => Session not found!')
  return // FAIL
}

// export async function validateWebSecret(routed: WebRouted) {
//   const secret = String(routed.req.header('secret'))

//   // When Valid
//   if (secret === getSecret('BOT_WEB_APP_SERVER_SECRET', routed.Bot.Log.Bot)) {
//     return routed
//   }

//   // Fallback - fail auth
//   routed.res.status(401).send({successful: false, error: 'Unauthorized'})
//   return
// }
