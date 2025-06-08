import AsRouteConfig from '../as-router.js';

export default new AsRouteConfig('/').get(function (req, res, next) {
  const db = req.app.get('database');
  db.getAccountTypes().then((accountTypes) => {
    res.json(accountTypes);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
