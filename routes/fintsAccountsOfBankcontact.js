import AsRouteConfig from '../as-router.js';
import FinTS from '../fints.js';
import config from '../config.js';
import _ from 'lodash';

const rc = new AsRouteConfig('/:idBankcontact/accounts');

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
  const db = req.app.get('database');
  const idBankcontact = parseInt(req.params.idBankcontact);
  if (idBankcontact === undefined) {
    console.log(`Missing idBankcontact parameter`);
    res.sendStatus(404);
    return;
  }

  try {
    const {fintsProductId, fintsProductVersion} = config;
    const bankcontact = await db.getBankcontact(idBankcontact);

    if (bankcontact.fintsUrl && bankcontact.fintsBankId && bankcontact.fintsUserId && bankcontact.fintsPassword && fintsProductId && fintsProductVersion) {
      const fints = FinTS.from(fintsProductId, fintsProductVersion, false, bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword, tanReference, tan);
      const result = await fints.dialogForSync();
      switch (result.status) {
        case FinTS.statusOK:
          await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: null, fintsAuthRequired: false});
          res.json({status: result.status, bankAccounts: mapBankAccounts(result.bankAccounts)});
          break;
        case FinTS.statusWrongPIN:
          console.log(`PIN WRONG for bankcontact ${idBankcontact} (${bankcontact.name}) - resetting to empty password`);
          await db.updateBankcontact(idBankcontact, {fintsPassword: null});
          await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {
            fintsError: result.message, fintsAuthRequired: false, fintsActivated: false,
          });
          res.json({status: result.status, message: result.message});
          break;
        case FinTS.statusRequiresTAN:
          await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {
            fintsError: result.message, fintsAuthRequired: true,
          });
          if (result.tanInfo.tanPhoto) {
            if (result.tanInfo.tanPhoto.image) {
              result.tanInfo.tanPhoto.image = Buffer.from(result.tanInfo.tanPhoto.image).toString('base64');
            }
          }
          res.json({status: result.status, tanInfo: result.tanInfo});
          break;
        default:
          const error = `Failed to synchronize bank contact ${idBankcontact} (${bankcontact.name})`;
          console.log(error);
          await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: error});
          res.sendStatus(500);
      }
    } else {
      const error = `Missing bankcontact configuration for bankcontact ${idBankcontact} (${bankcontact.name})`;
      console.log(error);
      await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: error, fintsActivated: false});
      res.sendStatus(500);
    }
  } catch (ex) {
    console.log(ex);
    await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {
      fintsError: ex.message?.substring(0, 250), fintsActivated: false
    });
    res.sendStatus(500);
  }
}

function mapBankAccounts(bankAcc) {
  return bankAcc.map(accountDetails => {
    return {
      accountNumber: accountDetails.accountNumber,
      name: (accountDetails.subAccountId && !accountDetails.subAccountId.includes('==')) ? accountDetails.subAccountId : accountDetails.product,
      type: accountDetails.accountType,
      currency: accountDetails.currency,
      accountHolder: accountDetails.holder1,
      iban: accountDetails.iban,
    }
  });
}

export default rc;
