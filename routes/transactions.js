import {AsRouteConfig} from 'as-express';

export default new AsRouteConfig('/').get(function (req, res, next) {
  const db = req.app.get('database');
  const maxItems = req.query.maxItems;
  const searchTerm = req.query.searchTerm;
  const accountsWhereIn = req.query.accountsWhereIn;
  const dateFilterFrom = req.query.dateFilterFrom;
  const dateFilterTo = req.query.dateFilterTo;
  db.getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo).then((transactions) => {
    res.json(transactions);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});
