import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  const maxItems = req.query.maxItems;
  const searchTerm = req.query.searchTerm;
  let accountsWhereIn = req.query.accountsWhereIn;
  if (accountsWhereIn) {
    accountsWhereIn = accountsWhereIn.split(',');
  }
  const dateFilterFrom = req.query.dateFilterFrom;
  const dateFilterTo = req.query.dateFilterTo;
  const idUser = req.user.id;
  const amountMin = req.query.amountMin;
  const amountMax = req.query.amountMax;
  const textToken = req.query.textToken;
  const mRefToken = req.query.mRefToken;

  db.getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, amountMin, amountMax, textToken, mRefToken).then((transactions) => {
    console.log(`Returning ${transactions.length} transactions in response`);
    res.json(transactions);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

rc.put(async (req, res, next) => {
  const transactionData = req.body;
  // todo explicitly pick values from body
  const db = req.app.get('database');
  try {
    const result = await db.addTransaction(transactionData);
    if (result.length > 0) {
      const resRow = result[0];
      console.log(`transaction created with id ${resRow.id}`);
      res.send(resRow.id, 200);
      res.status(200).send({id: resRow.id});
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