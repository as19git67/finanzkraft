import AsRouteConfig from '../as-router.js';
import _ from "lodash";

const rc = new AsRouteConfig('/:idAccount');

rc.post(function (req, res, next) {
  const { idAccount } = req.params;
  if (idAccount === undefined) {
    res.sendStatus(404);
    return;
  }
  const db = req.app.get('database');
  const updateData = _.pick(req.body,
    'name',
    'iban',
    'idAccountType',
    'idCurrency',
    'startBalance',
    'closedAt',
    'reader',
    'writer',
    'idBankcontact',
    'fintsAccountNumber',
    'fintsError',
    'fintsAuthRequired',
    'fintsActivated',
  );
  if (Object.keys(updateData).length === 0) {
    console.log('Ignoring empty update of account');
    res.sendStatus(200);
    return;
  }
  db.updateAccount(idAccount, updateData).then(() => {
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

export default rc;