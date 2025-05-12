import AsRouteConfig from '../as-router.js';

class RoleRouteConfig extends AsRouteConfig {
}

const rc = new RoleRouteConfig('/:idRole');

/* POST update role name */
rc.post((req, res, next) => {
  const { idRole } = req.params;
  if (idRole === undefined) {
    res.sendStatus(404);
    return;
  }
  const db = req.app.get('database');
  const { name } = req.body;
  db.updateRoleNameById(idRole, name).then(() => {
    res.sendStatus(200);
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
});

/* DELETE delete role */
rc.delete((req, res, next) => {
  const { idRole } = req.params;
  if (idRole === undefined) {
    res.sendStatus(404);
    return;
  }
  const db = req.app.get('database');
  db.deleteRole(idRole).then(() => {
    res.sendStatus(200);
  }).catch((error) => {
    switch (error.cause) {
      case 'constrain':
        console.error(error.message);
        res.sendStatus(422); // unprocessable entity
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
});

export default rc;
