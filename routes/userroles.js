import AsRouteConfig from '../as-router.js';
import _ from 'lodash';

class UserRoleRouteConfig extends AsRouteConfig {
}

const rc = new UserRoleRouteConfig('/:idUser/roles');

rc.get((req, res, next) => {
  const { idUser } = req.params;
  if (idUser === undefined) {
    res.sendStatus(404);
    return;
  }

  const db = req.app.get('database');
  db.getRolesOfUser(idUser).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });
});

rc.post((req, res, next) => {
  const { idUser } = req.params;
  if (idUser === undefined) {
    res.sendStatus(404);
    return;
  }
  const { roleIds } = req.body;
  if (roleIds === undefined || !_.isArray(roleIds)) {
    res.sendStatus(404);
    return;
  }

  const db = req.app.get('database');
  db.setRoleAssignmentsForUser(idUser, roleIds).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });
});

export default rc;
