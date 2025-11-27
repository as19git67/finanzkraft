import AsRouteConfig from '../as-router.js';
import passport from 'passport';

const rc = new AsRouteConfig('/');

rc.post((req, res, next) => {
  const auth = passport.authenticate('webauthn', {
    failureMessage: true,
    failWithError: true,
  });
  try {
    // auth is calling next if authentication was successful. To prevent from going into the fallback route in
    // app.js use a local next function here, which  ends the call with status 200
    auth(req, res, () => {
      console.log(`User ${req.user.Email} (${req.user.id}) authenticated successfully.`);

      if (req.isAuthenticated()) {
        const db = req.app.get('database');
        const promises = [];
        promises.push(db.createAccessTokenForUser(req.user.id));
        promises.push(db.getUsersPermissions(req.user.id));
        Promise.all(promises).then((results) => {
          console.log('finishing auth post with token');
          const data = results[0]; // tokenData
          const menuPermissions = results[1]; // menu basePermissions
          data.permissions = {
            menus: menuPermissions.map((m) => m.Menu),
          };
          res.json(data);
        }).catch((error) => {
          console.error(error);
          res.sendStatus(500);
        });
      } else {
        res.sendStatus(401);
      }


      // res.json({user: req.user});
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
