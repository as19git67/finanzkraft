import {AsRouteConfig} from 'as-express';

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  const maxItems = req.query.maxItems;
  const searchTerm = req.query.searchTerm;
  const accountsWhereIn = req.query.accountsWhereIn;
  const dateFilterFrom = req.query.dateFilterFrom;
  const dateFilterTo = req.query.dateFilterTo;
  const idUser = req.user.id;
  const textToken = req.query.textToken;
  const mRefToken = req.query.mRefToken;

  db.getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, textToken, mRefToken).then((transactions) => {
    res.json(transactions);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

rc.put(async (req, res, next) => {
  const transactionData = req.body;
  const db = req.app.get('database');
  try {
    const result = await db.addTransaction(transactionData);
    if (result.length > 0) {
      const id = result[0];
      console.log(`transaction created with id ${id}`);
      res.sendStatus(200, id);
    } else {
      throw new Error('Unable to create transaction');
    }
  } catch (error) {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      default:
        console.error(error);
        if (error.message) {
          res.send(500, error.message);
        } else {
          res.sendStatus(500);
        }
    }
  }
});


export default rc;