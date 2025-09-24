import AsRouteConfig from '../as-router.js';
import _ from "lodash";

const rc = new AsRouteConfig('/:id/');

rc.get(function (req, res, next) {
  const id = parseInt(req.params.id);
  const db = req.app.get('database');
  db.getBankcontact(id).then((bankcontact) => {
    res.json(bankcontact);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

/* POST update bankcontact */
rc.post((req, res, next) => {
  const db = req.app.get('database');
  const id = parseInt(req.params.id);
  if (id === undefined) {
    console.log("Can't update bankcontact with no id");
    res.send(404);
    return;
  }
  // pick only the fields that are known
  const data = _.pick(req.body, 'name', 'fintsUrl', 'fintsBankId', 'fintsUserId', 'fintsPassword');
  db.updateBankcontact(id,data).then((updatedBankcontact) => {
    res.send({updatedBankcontact});
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      case 'invalid':
        console.error(error.message);
        res.sendStatus(500);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  });
});

export default rc;