import AsRouteConfig from '../as-router.js';
import _ from 'lodash';

const rc = new AsRouteConfig('/:id/');

rc.get(function (req, res, next) {
  const idUser = req.user.id;
  const transactionId = parseInt(req.params.id);
  const db = req.app.get('database');
  const maxItems = req.query.maxItems;
  db.getTransaction(transactionId, idUser).then((transaction) => {
    res.json(transaction);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

rc.post((req, res, next) => {
  const idUser = req.user.id;
  const { id } = req.params;
  if (id === undefined) {
    res.send(404);
    return;
  }
  const db = req.app.get('database');
  const updateData = _.pick(req.body, 'idAccount', 't_booking_date', 't_value_date', 't_amount', 't_text', 't_notes', 'category_id',
    't_payee', 't_entry_text', 't_gvCode', 't_primaNotaNo', 't_payeePayerAcctNo', 't_processed', 'confirmed', 'tagIds');
  if (Object.keys(updateData).length === 0) {
    console.log('Ignoring empty update of transaction');
    res.sendStatus(200);
    return;
  }
  db.updateTransaction(id, updateData, idUser).then(() => {
    res.sendStatus(200);
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      case 'unknown':
        console.error(error.message);
        res.sendStatus(400);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  });
});

rc.delete(function (req, res, next) {
  const transactionId = parseInt(req.params.id);
  const db = req.app.get('database');
  db.deleteTransaction(transactionId).then(() => {
    res.sendStatus(200);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});


export default rc;
