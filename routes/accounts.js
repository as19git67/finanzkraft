import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  db.getAccounts().then((accounts) => {
    res.json(accounts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

rc.post(function (req, res, next) {
  const db = req.app.get('database');
  db.getAccounts().then((accounts) => {
    res.json(accounts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

export default rc;