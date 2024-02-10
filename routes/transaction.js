import {AsRouteConfig} from 'as-express';
import _ from 'lodash';

const rc = new AsRouteConfig('/:id/');

rc.get(function (req, res, next) {
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

rc.post((req, res, next) => {
  const { id } = req.params;
  if (id === undefined) {
    res.send(404);
    return;
  }
  const db = req.app.get('database');
  const updateData = _.pick(req.body, 'idAccount', 't_booking_date', 't_value_date', 't_amount', 't_text', 't_notes', 'idCategory',
    't_payee', 't_entry_text', 't_gvCode', 't_primaNotaNo', 't_payeePayerAcctNo', 't_processed');
  db.updateTransaction(id, updateData).then(() => {
    res.send(200);
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.send(422);
        break;
      case 'unknown':
        console.error(error.message);
        res.send(400);
        break;
      default:
        console.error(error);
        res.send(500);
    }
  });
});


export default rc;