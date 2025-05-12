import AsRouteConfig from '../as-router.js';

class UserRegistrationRouteConfig extends AsRouteConfig {
}

const rc = new UserRegistrationRouteConfig('/');
/* PUT create new user */
rc.put((req, res, next) => {
  const db = req.app.get('database');
  const { email } = req.body;
  const { password } = req.body;
  db.createUser(email, password).then(() => {
    res.send();
  }).catch((error) => {
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
  });
}, { bypassAuth: true });

rc.get((req, res, next) => {
  const db = req.app.get('database');
  db.getUser().then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });
});

export default rc;
