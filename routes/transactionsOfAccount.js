import AsRouteConfig from '../as-router.js';
import { DateTime } from "luxon";

const rc = new AsRouteConfig('/:id/transactions');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  const maxItems = req.query.limit;
  const searchTerm = undefined;
  const accountsWhereIn = [req.params.id];
  const dateFilterFrom = undefined;
  const dateFilterTo = undefined;
  const idUser = req.user.id;
  db.getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser).then((transactions) => {
    res.json(transactions);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

function isEqual(tr, key, sTr) {
  if (tr[key]) {
    return tr[key] === sTr['t_' + key];
  } else {
    return true;
  }
}

rc.post(async function (req, res, next) {
  const db = req.app.get('database');
  const accountId = req.params.id;
  const transactionsData = req.body.transactions ? req.body.transactions : [];
  let balance = {};
  if (req.body.balance && req.body.balance.valid) {
    balance = {
      idAccount: accountId,
      balance: req.body.balance.balance,
      balanceDate: DateTime.fromISO(req.body.balance.balanceDate).toJSDate(),
    };
  }
  const transactions = transactionsData.map((tr) => {
    if (tr.t_valueDate) {
      return {
        idAccount: accountId,
        valueDate: tr.t_valueDate,
        amount: tr.t_amount,
        text: tr.t_text,
        payee: tr.payee,
        idCategory: tr.idCategory,
      };
    } else {
      return {
        idAccount: accountId,
        bookingDate: DateTime.fromISO(tr.entryDate).toISO(),
        valueDate: DateTime.fromISO(tr.valueDate).toISO(),
        amount: tr.amount,
        text: tr.paymentPurpose,
        payee: tr.payeePayerName,
        payeePayerAcctNo: tr.payeePayerAcctNo,
        entryText: tr.entryText,
        primaNotaNo: tr.primaNotaNo,
        gvCode: tr.gvCode,
      };
    }
  });

  const transactionsToSave = [];
  for (const tra of transactions) {
    const fixedTr = db._fixTransactionData(tra);
    const from = DateTime.fromISO(tra.valueDate).minus({days: 5}).toISO();
    const to = DateTime.fromISO(tra.valueDate).plus({days: 2}).toISO();
    const savedTr = await db.getTransactions(50, fixedTr.text, [tra.idAccount], from, to);
    // search transaction in saved transactions and add the new transaction only if it was not found
    const filteredTransactions = savedTr.filter((sTr) => {
      if (fixedTr.text && fixedTr.text.trim()) {
        if (fixedTr.text.trim() !== sTr.t_text?.trim()) {
          return false;
        }
      }
      if (!isEqual(fixedTr, 'REF', sTr)) return false;
      if (!isEqual(fixedTr, 'EREF', sTr)) return false;
      if (!isEqual(fixedTr, 'CRED', sTr)) return false;
      if (!isEqual(fixedTr, 'MREF', sTr)) return false;
      if (!isEqual(fixedTr, 'ABWA', sTr)) return false;
      if (!isEqual(fixedTr, 'ABWE', sTr)) return false;
      if (!isEqual(fixedTr, 'IBAN', sTr)) return false;
      if (!isEqual(fixedTr, 'BIC', sTr)) return false;

      if (fixedTr.entryText && fixedTr.entryText.trim()) {
        if (fixedTr.entryText.trim() !== sTr.t_entry_text?.trim()) {
          return false;
        }
      }
      if (fixedTr.payeePayerAcctNo && fixedTr.payeePayerAcctNo.trim()) {
        if (fixedTr.payeePayerAcctNo.trim() !== sTr.t_payeePayerAcctNo?.trim()) {
          return false;
        }
      }
      if (fixedTr.gvCode && fixedTr.gvCode.trim()) {
        if (fixedTr.gvCode.trim() !== sTr.t_gvCode?.trim()) {
          return false;
        }
      }
      if (fixedTr.primaNotaNo && sTr.t_primaNotaNo) {
        const trPN = parseInt(fixedTr.primaNotaNo);
        const sTrPN = parseInt(sTr.t_primaNotaNo);
        if (trPN !== undefined && sTrPN !== undefined && trPN !== sTrPN) {
          return false;
        }
      }
      return fixedTr.amount === sTr.t_amount;
    });
    if (filteredTransactions.length === 0) {
      transactionsToSave.push(tra);
    }
  }
  if (transactionsToSave.length > 0) {
    db.addTransactions(transactionsToSave, {balance, unconfirmed: true}).then((storedTransactions) => {
      res.send(storedTransactions);
    }).catch((reason) => {
      console.log(reason);
      res.sendStatus(500);
    });
  } else {
    res.send([]);
  }
});

export default rc;