import AsRouteConfig from '../as-router.js';
import base64url from "base64url";

const rc = new AsRouteConfig('/');

rc.post(async (req, res, next) => {
  try {
    // todo: fail if user already exists
    const db = req.app.get('database');
    const {email} = req.body;
    const {password} = req.body;
    if (!email || !email.trim()) {
      console.log("Can't create user with empty email");
      res.sendStatus(400);  // bad request
      return;
    }
    if (!password || !password.trim()) {
      console.log("Can't create user with empty password");
      res.sendStatus(400);  // bad request
      return;
    }
    const emailTrimmed = email.trim();
    const userId = await db.createUser(emailTrimmed, password);
    console.log(`Created user ${emailTrimmed} with id ${userId}`);
    const user = {id: userId.toString(), name: emailTrimmed, displayName: emailTrimmed};

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
