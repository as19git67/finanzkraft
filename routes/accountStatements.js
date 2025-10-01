import AsRouteConfig from '../as-router.js';
import config from "../config.js";
import FinTS from "../fints.js";

const rc = new AsRouteConfig('/:idAccount/statements');

rc.get(async function (req, res, next) {
  try {
    const {fintsProductId, fintsProductVersion} = config;
    if (!fintsProductId || !fintsProductVersion) {
      console.log(`Missing fintsProductId or fintsProductVersion in config`);
      res.sendStatus(500);
      return;
    }
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

    const bankcontact = await db.getBankcontact(account.idBankcontact);
    if (!bankcontact.fintsUrl || !bankcontact.fintsBankId || !bankcontact.fintsUserId || !bankcontact.fintsPassword) {
      console.log(`Incomplete bankcontact configuration for bankcontact ${account.idBankcontact}`);
      res.sendStatus(500);
      return;
    }

    try {
      console.log(`Synchronizing bankcontact ${account.idBankcontact}: ${account.name}`);
      const fints = new FinTS(fintsProductId, fintsProductVersion);
      const result = await fints.synchronize(bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword);
      if (!result.success) {
        console.log(`Failed to synchronize bankcontact ${account.idBankcontact}`);
        for (let j = 0; j < result.bankAnswers.length; j++) {
          console.log(`Bank answers: ${result.bankAnswers[j].code} ${result.bankAnswers[j].text}`);
        }
        res.json(result);
        return;
      }
      const statements = await fints.getStatements(account.fintsAccountNumber);
      console.log(statements);
      await db.updateAccount(idAccount, {fintsError: null});
      res.json(result);
    } catch (ex) {
      await db.updateAccount(idAccount, {fintsError: ex.message});
      console.log(ex);
      res.sendStatus(500);
    }
  } catch (ex) {
    console.log(ex);
    res.sendStatus(500);
  }
});

export default rc;