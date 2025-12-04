import AsRouteConfig from '../as-router.js';
import base64url from "base64url";

const rc = new AsRouteConfig('/');

rc.post((req, res, next) => {
  try {
    const store = req.app.get('sessionChallengeStore');
    store.challenge(req, (err, challenge) => {
      if (err) {
        return next(err);
      }
      res.json({challenge: base64url.encode(challenge)});
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
