import AsRouteConfig from '../as-router.js';

class RolesRouteConfig extends AsRouteConfig {
}

const rc = new RolesRouteConfig('/');
/* PUT create new empty role */
rc.put((req, res, next) => {
  const db = req.app.get('database');
  const { name } = req.body;
  db.createRoleEmpty(name).then((id) => {
    res.send({ id });
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  });
});

rc.get((req, res, next) => {
  const db = req.app.get('database');
  db.getRoles().then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });
});

export default rc;
