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
  async function handleWrongPin(idBankcontact, bankcontact, result) {
    const db = req.app.get('database');
    console.log(`PIN WRONG for bankcontact ${idBankcontact} (${bankcontact.name}) - resetting to empty password`);
    await db.updateBankcontact(idBankcontact, {fintsPassword: null});
    await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {
      fintsError: result.message, fintsAuthRequired: false, fintsActivated: false,
    });
    res.json({status: result.status, message: result.message});
  }

  async function handleRequiresTan(idBankcontact, result) {
    const db = req.app.get('database');
    await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {
      fintsError: result.message, fintsAuthRequired: true,
    });
    res.json({status: result.status, tanInfo: result.tanInfo});
  }

  async function handleOtherError(idBankcontact, error) {
    const db = req.app.get('database');
    console.log(error);
    await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: error});
    res.sendStatus(500);
  }

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

    const idBankcontact = account.idBankcontact;
    const bankcontact = await db.getBankcontact(idBankcontact);
    if (!bankcontact.fintsUrl || !bankcontact.fintsBankId || !bankcontact.fintsUserId || !bankcontact.fintsPassword) {
      console.log(`Incomplete bankcontact configuration for bankcontact ${idBankcontact}`);
      await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: error, fintsActivated: false});
      res.sendStatus(500);
      return;
    }

    try {
      const transactions = await db.getTransactions(20, undefined, [idAccount]);
      let fromDate = DateTime.now().minus({days: 82});
      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        const tDate = DateTime.fromISO(t.t_value_date);
        if (tDate > fromDate) {
          fromDate = tDate;
        }
      }
      fromDate = fromDate.minus({days: 7}).toJSDate();

      const fints = FinTS.from(fintsProductId, fintsProductVersion, false, bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword, tanReference, tan);
      let result = await fints.dialogForSync();
      switch (result.status) {
        case FinTS.statusOK:
          await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: null, fintsAuthRequired: false});
          if (!result.bankAccounts.some(ba => ba.accountNumber === account.fintsAccountNumber)) {
            console.log(`Account ${account.fintsAccountNumber} not found in bank accounts of bank contact ${idBankcontact} (${bankcontact.name})`);
            res.sendStatus(404);
            return;
          }
          break;
        case FinTS.statusWrongPIN:
          await handleWrongPin(idBankcontact, bankcontact, result);
          return;
        case FinTS.statusRequiresTAN:
          await handleRequiresTan(idBankcontact, result);
          return;
        default:
          const error = `Failed to synchronize bank contact ${idBankcontact} (${bankcontact.name})`;
          await handleOtherError(idBankcontact, error);
          return;
      }

      fints.setTanAndReference(undefined, undefined); // clear tan and reference, because they were used in sync already
      result = await fints.dialogForStatements(account.fintsAccountNumber, fromDate);
      switch (result.status) {
        case FinTS.statusOK:
          await db.setFintsStatusOnAccountsOfBankcontact(idBankcontact, {fintsError: null, fintsAuthRequired: false});
          break;
        case FinTS.statusWrongPIN:
          await handleWrongPin(idBankcontact, bankcontact, result);
          return;
        case FinTS.statusRequiresTAN:
          await handleRequiresTan(idBankcontact, result);
          return;
        default:
          const error = `Failed to download account statements with bank contact ${idBankcontact} (${bankcontact.name}) for account ${account.name}`;
          await handleOtherError(idBankcontact, error);
          return;
      }

      const downloadedTransactions = mapStatements(result.statements, idAccount);
      const balance = {
        idAccount,
        ...(result.balance),
      };

      const transactionsToSave = [];
      for (let i = 0; i < downloadedTransactions.length && transactionsToSave.length < 50; i++) {
        const tra = downloadedTransactions[i];
        if (!(await db.transactionExists(tra))) {
          transactionsToSave.push(tra);
        }
      }
      if (transactionsToSave.length > 0) {
        const storedTransactions = await db.addTransactions(transactionsToSave, {balance, unconfirmed: true});
        console.log(`${storedTransactions.length} new transactions stored for account ID ${idAccount}`);
      }
      await db.updateAccount(idAccount, {fintsError: null});
      res.json({status: result.status, savedTransactions: transactionsToSave.length, balance: balance});
    } catch (ex) {
      console.log(ex);
      await db.updateAccount(idAccount, {fintsError: ex.message?.substring(0, 250)});
      res.sendStatus(500);
    }
  } catch (ex) {
    console.log(ex);
    res.sendStatus(500);
  }
}

function mapStatements(statements, idAccount) {
  const mappedStatements = [];
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    let st;
    if (statement.isAccountStatement) {
      st = {
        idAccount,
        bookingDate: statement.entryDate,
        valueDate: statement.valueDate,
        amount: statement.amount,
        entryText: statement.bookingText ? statement.bookingText.trim() : '',
        text: statement.purpose ? statement.purpose.trim() : '',
        EREF: null,
        CRED: null,
        MREF: null,
        ABWA: null,
        ABWE: null,
        IBAN: null,
        BIC: null,
        REF: statement.customerReference ? statement.customerReference.trim() : null,
        notes: null,
        payee: statement.remoteName ? statement.remoteName.trim() : null,
        payeePayerAcctNo: statement.remoteAccountNumber,
        payeeBankId: statement.remoteBankId,
        gvCode: statement.transactionType,
        primaNotaNo: statement.primeNotesNr,
        originalCurrency: null,
        originalAmount: null,
        exchangeRate: null,
      };
    } else {
      st = {
        idAccount,
        bookingDate: statement.transactionDate,
        valueDate: statement.valueDate,
        amount: statement.amount,
        entryText: null,
        text: statement.purpose ? statement.purpose.trim() : '',
        EREF: null,
        CRED: null,
        MREF: null,
        ABWA: null,
        ABWE: null,
        IBAN: null,
        BIC: null,
        REF: null,
        notes: null,
        payee: null,
        payeePayerAcctNo: null,
        gvCode: null,
        primaNotaNo: null,
        originalCurrency: statement.originalCurrency,
        originalAmount: statement.originalAmount,
        exchangeRate: statement.exchangeRate,
      };
    }
    mappedStatements.push(st);
  }
  return mappedStatements;
}

export default rc;