import AsRouteConfig from '../as-router.js';
import FinTS from '../fints.js';
import config from '../config.js';

const rc = new AsRouteConfig('/:idBankcontact/accounts');

function mapBankAccounts(bankAcc) {
  const synchronizedAccounts = bankAcc.map(accountDetails => {
    return {
      accountNumber: accountDetails.accountNumber,
      name: (accountDetails.subAccountId && !accountDetails.subAccountId.includes('==')) ? accountDetails.subAccountId : accountDetails.product,
      type: accountDetails.accountType,
      currency: accountDetails.currency,
      accountHolder: accountDetails.holder1,
      iban: accountDetails.iban,
    }
  });
  return synchronizedAccounts;
}

rc.get(async function (req, res, next) {
  try {
    const { fintsProductId, fintsProductVersion } = config;
    const idBankcontact = parseInt(req.params.idBankcontact);
    if (idBankcontact === undefined) {
      console.log(`Missing idBankcontact parameter`);
      res.sendStatus(404);
      return;
    }
    const db = req.app.get('database');
    const bankcontact = await db.getBankcontact(idBankcontact);

    if (bankcontact.fintsUrl && bankcontact.fintsBankId && bankcontact.fintsUserId && bankcontact.fintsPassword && fintsProductId && fintsProductVersion) {
      const fints = FinTS.from(fintsProductId, fintsProductVersion, false, bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword);
      const { success, bankAnswers, tanInfo, bankMessages} = await fints.synchronize();
      logSyncResponse(idBankcontact, success, bankAnswers, tanInfo, bankMessages);
      const pinOk = bankAnswers.find(bankAnswer => {
        return bankAnswer.code === 9910;
      }) === undefined;
      if (!pinOk) {
        console.log(`PIN WRONG for bankcontact ${idBankcontact} - resetting to empty password`);
        await db.updateBankcontact(idBankcontact,
            {fintsPassword: null, fintsActivated: false, fintsError: pinOk.message?.substring(0, 250)});
      }
      if (!success) {
        res.sendStatus(500);
        return;
      }

      if (tanInfo.requiresTan) {
        res.json({ tanInfo, bankAccounts: [], bankAnswers: bankAnswers });
      } else {
        const bankAns = fints.getBankAnswers();
        const synchronizedAccounts = mapBankAccounts(fints.getAccounts());
        res.json({ tanInfo, bankAccounts: synchronizedAccounts, bankAnswers: bankAns });
      }
    } else {
      console.log(`Missing bankcontact configuration for bankcontact ${idBankcontact}`);
      res.sendStatus(500);
    }
  } catch(ex) {
    console.log(ex);
    res.sendStatus(500);
  }
});

rc.post(async function (req, res, next) {
  try {
    const tanReference = req.body.tanReference;
    const tan = req.body.tan;
    if (tanReference === undefined) {
      console.log("Can't continue synchronization with no tanReference");
      res.sendStatus(404);
      return;
    }

    const { fintsProductId, fintsProductVersion } = config;
    const idBankcontact = parseInt(req.params.idBankcontact);
    if (idBankcontact === undefined) {
      console.log(`Missing idBankcontact parameter`);
      res.sendStatus(404);
      return;
    }
    const db = req.app.get('database');
    const bankcontact = await db.getBankcontact(idBankcontact);

    if (bankcontact.fintsUrl && bankcontact.fintsBankId && bankcontact.fintsUserId && bankcontact.fintsPassword && fintsProductId && fintsProductVersion) {
      const fints = FinTS.from(fintsProductId, fintsProductVersion, false, bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword);
      const { success, bankAnswers, tanInfo, bankMessages} = await fints.synchronizeWithTanReference(tanReference, tan);
      logSyncResponse(idBankcontact, success, bankAnswers, tanInfo, bankMessages);
      if (!success) {
        res.sendStatus(500);
        return;
      }

      if (tanInfo.requiresTan) {
        res.json({ tanInfo: tanInfo, bankAccounts: [], bankAnswers: bankAnswers });
      } else {
        const bankAns = fints.getBankAnswers();
        const synchronizedAccounts = mapBankAccounts(fints.getAccounts());
        res.json({ tanInfo: tanInfo, bankAccounts: synchronizedAccounts, bankAnswers: bankAns });
      }
    } else {
      console.log(`Missing bankcontact configuration for bankcontact ${idBankcontact}`);
      res.sendStatus(500);
    }
  } catch(ex) {
    console.log(ex);
    res.sendStatus(500);
  }
});

function logSyncResponse(idBankcontact, success, bankAnswers, tanInfo, bankMessages) {
  if (!success) {
    console.log(`Failed to synchronize bankcontact ${idBankcontact}`);
  }
  for (let j = 0; j < bankAnswers.length; j++) {
    console.log(`Bank answers: ${bankAnswers[j].code} ${bankAnswers[j].text}`);
  }
  for (let j = 0; j < bankMessages.length; j++) {
    console.log(`Bank message: ${bankMessages[j].subject} ${bankMessages[j].text}`);
  }
  console.log(`Requires TAN: ${tanInfo.requiresTan}`);
}

export default rc;
