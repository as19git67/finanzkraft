import AsRouteConfig from '../as-router.js';
import config from '../config.js';
import FinTS from '../fints.js';
import {DateTime} from 'luxon';

const rc = new AsRouteConfig('/:idAccount/statements');

rc.get(async function (req, res, next) {
  await handleRequest(req, res);
});

rc.post(async function (req, res, next) {
  const tanReference = req.body.tanReference;
  const tan = req.body.tan;
  if (tanReference === undefined) {
    console.log("Can't continue synchronization with no tanReference");
    res.sendStatus(404);
    return;
  }
  await handleRequest(req, res, tanReference, tan);
});

async function handleRequest(req, res, tanReference, tan) {
  try {
    const idAccount = parseInt(req.params.idAccount);
    if (idAccount === undefined) {
      console.log(`idAccount parameter missing`);
      res.sendStatus(404);
      return;
    }
    const db = req.app.get('database');
    const account = await db.getAccount(idAccount);
    if (!account.idBankcontact) {
      console.log(`Account ID: ${idAccount} has no bankcontact`);
      res.sendStatus(404);
      return;
    }

    const idBankcontact = account.idBankcontact;
    const bankcontact = await db.getBankcontact(idBankcontact);
    if (!bankcontact.fintsUrl || !bankcontact.fintsBankId || !bankcontact.fintsUserId || !bankcontact.fintsPassword) {
      console.log(`Incomplete bankcontact configuration for bankcontact ${idBankcontact}`);
      await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: error, fintsActivated: false});
      res.sendStatus(500);
      return;
    }

    try {
      const result = await db.downloadTransactionsFromBank(bankcontact, account, tanReference, tan);
      if (result.status === FinTS.statusError) {
        console.log(result.message);
        res.sendStatus(500);
        return;
      }
      res.json(result);
    } catch (ex) {
      console.log(ex);
      await this.updateAccount(idAccount, {fintsError: ex.message?.substring(0, 250)});
      res.sendStatus(500);
    }

  } catch (ex) {
    console.log(ex);
    res.sendStatus(500);
  }
}

export default rc;