import AsRouteConfig from '../as-router.js';

/* POST authenticate and create new access token */
export default new AsRouteConfig('/').post((req, res, next) => {
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
});
