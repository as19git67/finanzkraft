import AsRouteConfig from '../as-router.js';
import _ from "lodash";

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

rc.post(async (req, res, next) => {
  const {tIds, categoryId, tagIds} = req.body;
  if (tIds === undefined || (categoryId === undefined && (tagIds === undefined || !_.isArray(tagIds)))) {
    res.sendStatus(404);
    return;
  }

  const db = req.app.get('database');
  try {
    await db.updateTransactions(tIds, {categoryId: categoryId, tagIds: _.isArray(tagIds) ? tagIds : []});
    res.sendStatus(200);
  } catch (error) {
    switch (error.cause) {
      case 'invalid':
      case 'undefined':
        console.error(error.message);
        res.sendStatus(400); // bad request
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