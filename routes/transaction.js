import {AsRouteConfig} from 'as-express';

const rc = new AsRouteConfig('/:id/').get(function (req, res, next) {
  const transactionId = parseInt(req.params.id);
  const db = req.app.get('database');
  const maxItems = req.query.maxItems;
  db.getTransaction(transactionId).then((transaction) => {
    res.json(transaction);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

export default rc;