import AsRouteConfig from '../as-router.js';


const rc = new AsRouteConfig('/:idAccount');

rc.get(async function (req, res, next) {
  const { idAccount } = req.params;
  if (idAccount === undefined) {
    res.sendStatus(404);
    return;
  }
  const db = req.app.get('database');
  // get accounts with bankcontact set and fints not temporarily paused due to error or required auth

  // for each account get bankcontact

    // get latest statements for account and created hash for each entry
    // synchronize bankcontact
      // if strong auth required => temp disable bankcontact
    // download statements from last download date on
    // add new statements (compare hash)



  try {
  const account = await db.getAccountById(idAccount);
  if (account.idBankcontact) {
    const bankcontact = await db.getBankcontact(account.idBankcontact);
    // fints.synchronize
    const result = [{}];
    const synchronizedAccounts = result.map(accountDetails => {
      return {
        accountNumber: accountDetails.accountNumber,
        name: accountDetails.subAccountId ? accountDetails.subAccountId : accountDetails.accountNumber,
      }
    });
    res.json(synchronizedAccounts);
  } else {
    console.log(`Account ID: ${idAccount} has no bankcontact`);
    res.sendStatus(404);
  }

  } catch(ex) {
    console.log(ex);
    res.send(500);
  };
});

export default rc;