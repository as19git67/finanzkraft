import AsRouteConfig from '../as-router.js';

export default new AsRouteConfig('/').get(function (req, res, next) {
  const db = req.app.get('database');
  db.getTags().then((tags) =>{
    res.json(tags);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
