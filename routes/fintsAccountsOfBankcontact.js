import AsRouteConfig from '../as-router.js';
import FinTS from '../fints.js';
import config from '../config.js';

const rc = new AsRouteConfig('/:idBankcontact/accounts');

rc.get(async function (req, res, next) {
  try {
    const { fintsProductId, fintsProductVersion, privateKeyPassphrase } = config;
    const idBankcontact = parseInt(req.params.idBankcontact);
    if (idBankcontact === undefined) {
      console.log(`Missing idBankcontact parameter`);
      res.sendStatus(404);
      return;
    }
    const db = req.app.get('database');
    const bankcontact = await db.getBankcontact(idBankcontact);

    if (bankcontact.fintsUrl && bankcontact.fintsBankId && bankcontact.fintsUserId && bankcontact.fintsPassword && fintsProductId && fintsProductVersion) {
      const fints = new FinTS(fintsProductId, fintsProductVersion);
      const {
        success,
        bankAnswers,
        requiresTan,
        bankMessages,
        bankingInformation
      } = await fints.synchronize(bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword);
      for (let j = 0; j < bankAnswers.length; j++) {
        console.log(`Bank answers: ${bankAnswers[j].code} ${bankAnswers[j].text}`);
      }
      for (let j = 0; j < bankMessages.length; j++) {
        console.log(`Bank message: ${bankMessages[j].subject} ${bankMessages[j].text}`);
      }
      console.log(`Requires TAN: ${requiresTan}`);
      if (!success) {
        console.log(`Failed to synchronize bankcontact ${idBankcontact}`);
        res.sendStatus(500);
        return;
      }

      if (requiresTan) {
        res.json({ requiresTan: true, bankAccounts: [], bankAnswers: bankAnswers });
      } else {
        const bankAns = fints.getBankAnswers();
        const bankAcc = fints.getAccounts();

        const synchronizedAccounts = bankAcc.map(accountDetails => {
          return {
            accountNumber: accountDetails.accountNumber,
            name: accountDetails.subAccountId ? accountDetails.subAccountId : accountDetails.product,
            type: accountDetails.accountType,
            currency: accountDetails.currency,
            accountHolder: accountDetails.holder1,
            iban: accountDetails.iban,
          }
        });
        res.json({ requiresTan: true, bankAccounts: synchronizedAccounts, bankAnswers: bankAns });
      }
    } else {
      console.log(`Missing bankcontact configuration for bankcontact ${idBankcontact}`);
      res.sendStatus(500);
    }
  } catch(ex) {
    console.log(ex);
    res.send(500);
  }
});

export default rc;
