import { AsRouteConfig } from 'as-express';

//export default new AsRouteConfig().get('/gattung/', function (req, res, next) {
export default new AsRouteConfig('/').get(function (req, res, next) {
  const db = req.app.get('database');
  db.getAccounts().then((accounts) =>{
    res.json(accounts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
