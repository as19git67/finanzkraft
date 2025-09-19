import AsRouteConfig from '../as-router.js';
import _ from "lodash";

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  db.getBankcontacts().then((bankcontacts) => {
    res.json(bankcontacts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

/* PUT create new bankcontact */
rc.put((req, res, next) => {
  const db = req.app.get('database');
  const data = _.pick(req.body, 'name', 'fintsUrl', 'fintsBankId', 'fintsUserId');
  if (req.body.fintsPassword) {
    // todo: encrypt password
    // data.fintsPasswordEncrypted = enryptPassword(req.body.fintsPassword);
  }
  db.addBankcontact(data).then((newBankcontact) => {
    res.send({newBankcontact});
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  });
});

export default rc;