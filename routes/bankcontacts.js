import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  db.getBankcontacts().then((bankcontacts) => {
    res.json(bankcontacts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

export default rc;