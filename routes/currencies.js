import AsRouteConfig from '../as-router.js';

export default new AsRouteConfig('/').get(function (req, res, next) {
  const db = req.app.get('database');
  db.getCurrencies().then((currencies) =>{
    res.json(currencies);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
