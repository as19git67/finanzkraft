import AsRouteConfig from '../as-router.js';
import base64url from "base64url";

const rc = new AsRouteConfig('/');

rc.post(async (req, res, next) => {
  try {
    // todo: fail if user already exists
    const db = req.app.get('database');
    const {email} = req.body;
    const {password} = req.body;
    const userId = await db.createUser(email, password);
    console.log(`Created user ${email} with id ${userId}`);
    const user = {id: userId.toString(), name: email, displayName: email};

    const store = req.app.get('sessionChallengeStore');
    store.challenge(req, {user}, function (err, challenge) {
      if (err) {
        return next(err);
      }
      res.json({user: user, challenge: base64url.encode(challenge)});
    });

  } catch (error) {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      case 'unknown':
        console.error(error.message);
        res.sendStatus(400);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  }
}, {bypassAuth: true});

export default rc;
