import { AsRouteConfig } from 'as-express';

//export default new AsRouteConfig().get('/gattung/', function (req, res, next) {
export default new AsRouteConfig().get('/', function (req, res, next) {
  const db = req.app.get('database');
  db.getTimespans().then((timespans) =>{
    res.json(timespans);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
