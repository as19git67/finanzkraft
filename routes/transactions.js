import {AsRouteConfig} from 'as-express';

const rc = new AsRouteConfig('/').get(function (req, res, next) {
  const db = req.app.get('database');
  const maxItems = req.query.maxItems;
  const searchTerm = req.query.searchTerm;
  const accountsWhereIn = req.query.accountsWhereIn;
  const dateFilterFrom = req.query.dateFilterFrom;
  const dateFilterTo = req.query.dateFilterTo;
  const idUser = req.user.id;
  db.getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser).then((transactions) => {
    res.json(transactions);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

export default rc;