import { AsRouteConfig } from 'as-express';
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

rc.post(async function (req, res, next) {
  const db = req.app.get('database');
  const accountId = req.params.id;
  const transactionsData = req.body.transactions ? req.body.transactions : [];
  let balance;
  let balanceDate;
  let balanceValid = false;
  if (req.body.balance && req.body.balance.valid) {
    balanceValid = req.body.balance.valid;
    balance = req.body.balance.balance;
    balanceDate = req.body.balance.balanceDate;
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
  for (const tr of transactions) {
    const from = DateTime.fromISO(tr.valueDate).minus({days: 5}).toISO();
    const to = DateTime.fromISO(tr.valueDate).plus({days: 2}).toISO();
    const savedTr = await db.getTransactions(10, tr.text, [tr.idAccount], from, to);
    // search transaction in saved transactions and add the new transaction only if it was not found
    const filteredTransactions = savedTr.filter((sTr) => {
      if (tr.text && tr.text.trim()) {
        if (tr.text.trim() !== sTr.t_text?.trim()) {
          return false;
        }
      }
      if (tr.entryText && tr.entryText.trim()) {
        if (tr.entryText.trim() !== sTr.t_entry_text?.trim()) {
          return false;
        }
      }
      if (tr.payeePayerAcctNo && tr.payeePayerAcctNo.trim()) {
        if (tr.payeePayerAcctNo.trim() !== sTr.t_payeePayerAcctNo?.trim()) {
          return false;
        }
      }
      if (tr.gvCode && tr.gvCode.trim()) {
        if (tr.gvCode.trim() !== sTr.t_gvCode?.trim()) {
          return false;
        }
      }
      if (tr.primaNotaNo && sTr.t_primaNotaNo) {
        const trPN = parseInt(tr.primaNotaNo);
        const sTrPN = parseInt(sTr.t_primaNotaNo);
        if (trPN !== undefined && sTrPN !== undefined && trPN !== sTrPN) {
          return false;
        }
      }
      return tr.amount === sTr.t_amount;
    });
    if (filteredTransactions.length === 0) {
      transactionsToSave.push(tr);
    }
  }
  if (transactionsToSave.length > 0) {
    db.addTransactions(transactionsToSave).then((storedTransactions) => {
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