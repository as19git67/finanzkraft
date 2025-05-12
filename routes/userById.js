import AsRouteConfig from '../as-router.js';

class UserByIdRouteConfig extends AsRouteConfig {
}

const rc = new UserByIdRouteConfig('/:idUser');

rc.post((req, res, next) => {
  const { idUser } = req.params;
  if (idUser === undefined) {
    res.sendStatus(404);
    return;
  }
  const db = req.app.get('database');
  const { updateData } = req.body;
  db.updateUserById(idUser, updateData).then(() => {
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

export default rc;
