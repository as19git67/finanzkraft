import AsRouteConfig from '../as-router.js';
import passport from 'passport';

const rc = new AsRouteConfig('/');

rc.post((req, res, next) => {
  const auth = passport.authenticate('webauthn', {
    failureMessage: true,
    failWithError: true,
  });
  try {
    auth(req, res, next);
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
