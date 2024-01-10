import {AsRouteConfig} from 'as-express';

export default new AsRouteConfig().get('/', function (req, res, next) {
  const db = req.app.get('database');
  db.getTransactions().then((transactions) => {
    res.json(transactions);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
