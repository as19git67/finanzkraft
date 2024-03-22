import _ from 'lodash';
import {referrerPolicy} from "helmet";

const DbMixinTransactions = {
  _maxTextToken: 20,

  getMixinName() {
    return 'DbMixinTransactions';
  },

  _selectTransactions: function (idTransaction, maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, textToken, mRefToken) {
    const columnsToSelect = [
      'Fk_Account.id as account_id', 'Fk_Account.name as account_name', 'Fk_Transaction.id as t_id',
      'Fk_Transaction.bookingDate as t_booking_date', 'Fk_Transaction.valueDate as t_value_date',
      'Fk_Transaction.text as t_text', 'Fk_Transaction.EREF as t_EREF', 'Fk_Transaction.CRED as t_CRED', 'Fk_Transaction.MREF as t_MREF', 'Fk_Transaction.entryText as t_entry_text', 'Fk_Transaction.amount as t_amount',
      'Fk_Transaction.notes as t_notes', 'Fk_Transaction.payee as t_payee', 'Fk_Transaction.primaNotaNo as t_primaNotaNo',
      'Fk_Transaction.payeePayerAcctNo as t_payeePayerAcctNo', 'Fk_Transaction.gvCode as t_gvCode',
      'Fk_Transaction.processed as t_processed', 'Fk_Category.id as category_id',
      'Fk_Category.fullName as category_name', 'Fk_Currency.id as currency_id',
      'Fk_Transaction.idRuleSet as rule_set_id', 'Fk_RuleSet.name as rule_set_name',
      'Fk_Currency.name as currency_name', 'Fk_Currency.short as currency_short'];
    if (idUser) {
      columnsToSelect.push('Fk_TransactionStatus.confirmed as confirmed');
    }
    const builder = this.knex.table('Fk_Transaction')
    .join('Fk_Account', function () {
      this.on('Fk_Transaction.idAccount', '=', 'Fk_Account.id');
      if (accountsWhereIn && _.isArray(accountsWhereIn) && accountsWhereIn.length > 0) {
        this.andOnIn('Fk_Account.id', accountsWhereIn);
      }
    })
    .join('Fk_Currency', function () {
      this.on('Fk_Account.idCurrency', '=', 'Fk_Currency.id');
    })
    .leftJoin('Fk_Category', function () {
      this.on('Fk_Transaction.idCategory', '=', 'Fk_Category.id');
    })
    .leftJoin('Fk_RuleSet', function () {
      this.on('Fk_Transaction.idRuleSet', '=', 'Fk_RuleSet.id');
    })
    .where((builder) => {
      if (idTransaction !== undefined) {
        builder.where({'Fk_Transaction.id': idTransaction});
      }
    })
    .andWhere((builder) => {
      if (_.isArray(textToken)) {
        _.take(textToken, this._maxTextToken).forEach(tt => {
          if (this.supportsILike()) {
            builder.whereILike('Fk_Transaction.text', `%${tt}%`);
          } else {
            builder.whereLike('Fk_Transaction.text', `%${tt}%`);
          }
        });
      }
      if (_.isString(mRefToken)) {
        if (this.supportsILike()) {
          builder.whereILike('Fk_Transaction.MREF', `%${mRefToken}%`);
        } else {
          builder.whereLike('Fk_Transaction.MREF', `%${mRefToken}%`);
        }
      }
      if (searchTerm) {
        if (_.isString(searchTerm)) {
          const trimmedSearchTerm = searchTerm.trim();
          if (this.supportsILike()) {
            builder.whereILike('Fk_Transaction.text', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.notes', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.EREF', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.CRED', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.MREF', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.payee', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Category.fullName', `%${trimmedSearchTerm}%`);
          } else {
            builder.whereLike('Fk_Transaction.text', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.EREF', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.CRED', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.MREF', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.notes', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.payee', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Category.fullName', `%${trimmedSearchTerm}%`);
          }
        }
        const amount = parseFloat(searchTerm);
        if (amount) {
          builder.orWhere('Fk_Transaction.amount', amount);
          builder.orWhere('Fk_Transaction.amount', amount * -1);
        }
      }
    })
    .andWhere((builder) => {
      if (dateFilterFrom) {
        builder.where('valueDate', '>=', dateFilterFrom);
      }
      if (dateFilterTo) {
        builder.andWhere('valueDate', '<=', dateFilterTo);
      }
    })
    .orderBy('Fk_Transaction.valueDate', 'desc')
    .select(columnsToSelect);
    if (maxItems) {
      builder.limit(maxItems);
    }
    if (idUser !== undefined) {
      builder.leftJoin('Fk_TransactionStatus', function () {
        this.on('Fk_Transaction.id', '=', 'Fk_TransactionStatus.idTransaction');
        this.andOn('Fk_TransactionStatus.idUser', '=', idUser);
      });
    }
    return builder;
  },

  async getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, textToken, mRefToken) {
    return this._selectTransactions(undefined, maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, textToken, mRefToken);
  },

  async getTransaction(idTransaction, idUser) {
    if (!idTransaction) {
      throw new Error('Undefined idTransaction', {cause: 'unknown'});
    }
    const results = await this._selectTransactions(idTransaction, undefined, undefined, undefined, undefined, undefined, idUser);
    if (results.length > 0) {
      return results[0];
    } else {
      throw new Error(`Transaction with id ${idTransaction} does not exist`, {cause: 'unknown'});
    }
  },

  _extractFromText: function (tRet, marker, property) {
    let pos = tRet.text.lastIndexOf(marker);
    if (pos >= 0) {
      tRet[property] = tRet.text.substring(pos + marker.length).trim();
      tRet.text = tRet.text.substring(0, pos).trim();
    }
  },

  _parseText: function(parsed, text, markers, key) {
    for (const marker of markers) {
      let pos = text.lastIndexOf(marker);
      if (pos >= 0) {
        parsed.push({
          pos: pos,
          key: key,
          keyLen: marker.length,
        });
        break;
      }
    }
  },
  
  _eliminateSpaces: function(tRet, property) {
    if (tRet[property]) {
      tRet[property] = tRet[property].replace(/\s+/g, '');
    }
  },

  // Convert empty values to undefined for having null in DB
  _fixTransactionData: function (t) {
    const tRet = t;
    if (t.processed === undefined) {
      tRet.processed = false;
    }
    if (_.isString(t.text) && t.text.trim().length === 0) {
      tRet.text = undefined;
    } else {
      if (_.isString(tRet.text)) {
        const parts = [];
        this._parseText(parts, tRet.text, ['ABWE:', 'ABWE+'], 'ABWE');
        this._parseText(parts, tRet.text, ['ABWA:', 'ABWE+'], 'ABWA');
        this._parseText(parts, tRet.text, ['ANAM:'], 'ANAM');
        this._parseText(parts, tRet.text, ['BIC:', 'BIC '], 'BIC');
        this._parseText(parts, tRet.text, ['IBAN:', 'IBAN '], 'IBAN');
        this._parseText(parts, tRet.text, ['Ref.'], 'REF');
        this._parseText(parts, tRet.text, ['GLÄUBIGER-ID:', 'CRED:', 'CRED'], 'CRED');
        this._parseText(parts, tRet.text, ['CORE / MANDATSREF.:', 'COR1 / MANDATSREF.:', 'MREF:', 'MREF '], 'MREF');
        this._parseText(parts, tRet.text, ['SVWZ:'], 'SVWZ');
        this._parseText(parts, tRet.text, ['END-TO-END-REF.:', 'EREF:', ' EREF '], 'EREF');
        if (parts.length > 0) {
          const sorted = parts.toSorted((a, b) => {
            if (a.pos < b.pos) {
              return 1;
            }
            if (a.pos > b.pos) {
              return -1;
            }
            return 0;
          });

          for (const partInfo of sorted) {
            let part = tRet.text.substring(partInfo.pos + partInfo.keyLen).trim();
            switch (partInfo.key) {
              case 'BIC':
              case 'IBAN':
              case 'CRED':
              case 'MREF':
                part = part.replace(/\s+/g, '');
                tRet[partInfo.key] = part;
                break;
              case 'ANAM':
                // ignore this, because it duplicates payee
                break;
              case 'EREF':
              case 'ABWE':
              case 'ABWA':
                part = part.replace(/\s+/g, '');
                if (part !== 'NICHT ANGEGEBEN' && part !== 'NOTPROVIDED') {
                  // store only if not not-provided
                  tRet[partInfo.key] = part;
                }
                break;
              case 'SVWZ':
                tRet[partInfo.key] = part;
                break;
              default:
                tRet[partInfo.key] = part;
            }

            tRet.text = tRet.text.substring(0, partInfo.pos);
          }
          if (tRet.SVWZ) {
            tRet.text = tRet.SVWZ + ' ' + tRet.text;  // insert SEPA Verwendungszweck at beginning of text
            delete tRet.SVWZ;
          }
          tRet.text = tRet.text.trim();

          // this._extractFromText(tRet, 'ABWE:', 'ABWE');
          // this._extractFromText(tRet, 'ABWE+', 'ABWE');
          // this._extractFromText(tRet, 'ABWA:', 'ABWA');
          // this._extractFromText(tRet, 'ABWA', 'ABWA');
          // this._extractFromText(tRet, 'ANAM:', 'ANAM');
          // this._extractFromText(tRet, 'BIC:', 'BIC');
          // this._eliminateSpaces(tRet, 'BIC');
          // this._extractFromText(tRet, 'IBAN:', 'IBAN');
          // this._extractFromText(tRet, 'IBAN', 'IBAN');
          // this._eliminateSpaces(tRet, 'IBAN');
          // this._extractFromText(tRet, 'Ref.', 'ref');
          // this._extractFromText(tRet, 'GLÄUBIGER-ID:', 'CRED');
          // this._extractFromText(tRet, 'CRED:', 'CRED');
          // this._eliminateSpaces(tRet, 'CRED');
          // this._extractFromText(tRet, 'COR1 / MANDATSREF.:', 'MREF');
          // this._extractFromText(tRet, 'CORE / MANDATSREF.:', 'MREF');
          // this._extractFromText(tRet, 'MREF:', 'MREF');
          // this._eliminateSpaces(tRet, 'MREF');
          // this._extractFromText(tRet, 'SVWZ:', 'SVWZ');
          // this._extractFromText(tRet, 'END-TO-END-REF.:', 'EREF');
          // this._extractFromText(tRet, 'EREF:', 'EREF');
          // delete tRet.ANAM; // duplicates payee
          // if (tRet.EREF === 'NICHT ANGEGEBEN' || tRet.EREF === 'NOTPROVIDED') {
          //   delete tRet.EREF;
          // }
          // if (tRet.ABWE === 'NICHT ANGEGEBEN' || tRet.ABWE === 'NOTPROVIDED') {
          //   delete tRet.ABWE;
          // }
          // if (tRet.ABWA === 'NICHT ANGEGEBEN' || tRet.ABWA === 'NOTPROVIDED') {
          //   delete tRet.ABWA;
          // }
        }
      }
    }
    if (_.isString(t.payee) && t.payee.trim().length === 0) {
      tRet.payee = undefined;
    }
    if (_.isString(t.payeePayerAcctNo) && t.payeePayerAcctNo.trim().length === 0) {
      tRet.payeePayerAcctNo = undefined;
    }
    if (_.isString(t.entryText) && t.entryText.trim().length === 0) {
      tRet.entryText = undefined;
    }
    if (_.isString(t.gvCode) && t.gvCode.trim().length === 0) {
      tRet.gvCode = undefined;
    }
    if (t.primaNotaNo !== undefined) {
      if (_.isString(t.primaNotaNo) && t.primaNotaNo.trim().length === 0) {
        tRet.primaNotaNo = undefined;
      } else {
        if (parseInt(t.primaNotaNo) === 0) {
          tRet.primaNotaNo = undefined;
        }
      }
    }
    return tRet;
  },

  async _runRules(trx, t) {
    let tr = {...t};
    /*
        const rules = await trx('Fk_RuleSet').select(['Fk_RuleSet.id as idRuleSet', 'Fk_RuleSet.name as ruleSetName',
          'Fk_RuleSet.set_note as setNote', 'Fk_RuleSet.idSetCategory as setIdCategory',
          'Fk_Rule.idAccount', 'Fk_Rule.entryText', 'Fk_Rule.text', 'Fk_Rule.payee', 'Fk_Rule.payeePayerAcctNo',
          'Fk_Rule.gvCode',
        ])
        .join('Fk_Rule', function () {
          this.on('Fk_RuleSet.id', '=', 'Fk_Rule.idRuleSet');
        })
        .where(function () {
          this.where('Fk_Rule.idAccount', '=', tr.idAccount);
          this.orWhere(function() {
            this.whereNull('Fk_Rule.idAccount');
          })
        });
        let matchingRule = undefined;
        for (const rule of rules) {
          if (rule.entryText) {
            if (!t.entryText) {
              continue;
            }
            const entryText = t.entryText.trim().toLowerCase();
            if (entryText.indexOf(rule.entryText.trim().toLowerCase()) < 0) {
              continue; // try next rule
            }
          }
          if (rule.text) {
            if (!t.text) {
              continue;
            }
            const text = t.text.trim().toLowerCase();
            if (text.indexOf(rule.text.trim().toLowerCase()) < 0) {
              continue; // try next rule
            }
          }
          if (rule.payee) {
            if (!t.payee) {
              continue;
            }
            const payee = t.payee.trim().toLowerCase();
            if (payee.indexOf(rule.payee.trim().toLowerCase()) < 0) {
              continue; // try next rule
            }
          }
          if (rule.payeePayerAcctNo) {
            if (!t.payeePayerAcctNo) {
              continue;
            }
            const payeePayerAcctNo = t.payeePayerAcctNo.trim().toLowerCase();
            if (payeePayerAcctNo.indexOf(rule.payeePayerAcctNo.trim().toLowerCase()) < 0) {
              continue; // try next rule
            }
          }
          if (rule.gvCode) {
            if (!t.gvCode) {
              continue;
            }
            const gvCode = t.gvCode.trim().toLowerCase();
            if (gvCode.indexOf(rule.gvCode.trim().toLowerCase()) < 0) {
              continue; // try next rule
            }
          }
          // if (rule.primaNotaNo !== null) {
          //   const primaNotaNo = t.primaNotaNo;
          //   if (primaNotaNo !== rule.primaNotaNo) {
          //     continue; // try next rule
          //   }
          // }
          matchingRule = rule;
          break;  // skip other rules of set - one is enough
        }
        if (matchingRule) {
          console.log(`rule set ${matchingRule.ruleSetName} matches`);
          if (matchingRule.setNote) {
            tr.notes = matchingRule.setNote;
          }
          if (matchingRule.setIdCategory) {
            tr.idCategory = matchingRule.setIdCategory;
          }
          tr.idRuleSet = matchingRule.idRuleSet;
        }
        tr.processed = true;
    */
    return tr;
  },

  _applyRulesInTrx: async function (trx, idRuleSet, includeProcessed, includeTransactionsWithRuleSet, minMatchRate) {
    /*
    select matches, RulesPerSet, (matches * 100/RulesPerSet) as matchRate, r.idRuleSet, r.id, tr.amount, tr.text
      from Fk_Transaction tr
      join (
          SELECT count(RT.text) as matches, RT.idRuleSet, t.id
              FROM Fk_transaction t
              JOIN Fk_RuleText RT ON t.text LIKE '%' + RT.text + '%'
              join Fk_Transaction tr on t.id = tr.id and t.processed = 'false' and t.idRuleSet is null
          group by RT.idRuleSet, t.id
      ) r on tr.id = r.id
      join (
          SELECT count(RT.text) as RulesPerSet, RT.idRuleSet
          FROM Fk_RuleText RT
          group by RT.idRuleSet
      ) RTC on RTC.idRuleSet = r.idRuleSet
   */
    const joinRaw = this.supportsILike() ? "JOIN Fk_RuleText RT ON t.text LIKE '%' + RT.text + '%'" : "JOIN Fk_RuleText RT ON t.text LIKE '%' || RT.text || '%'";
    const matchingTransactions = await trx.select(['matches',
      'RulesPerSet',
      'r.idRuleSet', 'r.idSetCategory', 'r.set_note', 'r.id',
      'tr.amount', 'tr.text',
    ]).select(trx.raw('(matches * 100/RulesPerSet) as matchRate'))
    .table('Fk_Transaction as tr')
    .join(
      trx.count({matches: 'RT.text'}).select(['RT.idRuleSet', 'RS.idSetCategory', 'RS.set_note', 't.id'])
      .table('Fk_Transaction as t')
      .joinRaw(joinRaw).where(function () {
        if (idRuleSet !== undefined) {
          this.andWhere('RT.idRuleSet', idRuleSet);
        }
      })
      //          this.on('t.text', 'like', "RT.text");
      .join('Fk_RuleSet as RS', function () {
        this.on('RT.idRuleSet', '=', 'RS.id');
      })
      .join('Fk_Transaction as tr', function () {
        this.on('t.id', '=', 'tr.id');
      })
      .groupBy([' RT.idRuleSet', 'RS.idSetCategory', 'RS.set_note', 't.id']).as('r'), function () {
        this.on('tr.id', '=', 'r.id');
        if (!includeProcessed) {
          this.andOnVal('tr.processed', false);
        }
        if (!includeTransactionsWithRuleSet) {
          this.andOnNull('tr.idRuleSet');
        }
      }
    )
    .join(
      trx.count({RulesPerSet: 'RT.text'}).select('RT.idRuleSet')
      .table('Fk_RuleText as RT')
      .groupBy('RT.idRuleSet').as('RTC'), function () {
        this.on('RTC.idRuleSet', '=', 'r.idRuleSet');
      }
    )
    .whereRaw('(matches * 100/RulesPerSet) >= ?', [minMatchRate]);

    for (const m of matchingTransactions) {
      const updateData = {
        processed: true,
        idRuleSet: m.idRuleSet,
      };
      if (m.set_note) {
        updateData.notes = m.set_note;
      }
      if (m.idSetCategory) {
        updateData.idCategory = m.idSetCategory;
      }
      await trx.table('Fk_Transaction').where('id', m.id).update(updateData);
      console.log(`Updated transaction ${m.id} with category: ${updateData.idCategory}, notes ${updateData.notes}`);
    }
    // if (matchingTransactions.length > 0) {
    //   console.log('Erster Datensatz:')
    //   for (const key in matchingTransactions[0]) {
    //     console.log(`${key}: ${matchingTransactions[0][key]}`);
    //   }
    // }

    return matchingTransactions;
  },

  async applyRules(options) {
    const o = options ? options : {};
    const trx = options.trx;
    const idRuleSet = o.idRuleSet;
    const includeProcessed = o.includeProcessed;
    const includeTransactionsWithRuleSet = o.includeTransactionsWithRuleSet;
    const minMatchRate = o.minMatchRate ? o.minMatchRate : 100;
    if (trx) {
      return await this._applyRulesInTrx(trx, idRuleSet, includeProcessed, includeTransactionsWithRuleSet, minMatchRate);
    } else {
      return this.knex.transaction(async (newTrx) => {
        return await this._applyRulesInTrx(newTrx, idRuleSet, includeProcessed, includeTransactionsWithRuleSet, minMatchRate);
      });
    }
  },

  async addTransaction(transactionData) {
    const fixedTransactionData = this._fixTransactionData(transactionData);
    return this.knex('Fk_Transaction').insert(fixedTransactionData).returning('id');
  },

  async addTransactions(transactions) {
    const trToInsert = transactions.map((t) => {
      return this._fixTransactionData(t);
    });
    return this.knex.transaction(async (trx) => {
      let inserts = [];
      let processedRrToInsert = [];
      if (trToInsert.length > 0) {
        for (const tr of trToInsert) {
          processedRrToInsert.push(await this._runRules(trx, tr));
        }
        inserts = await trx('Fk_Transaction').insert(processedRrToInsert).returning('*');
        console.log(`Inserted ${inserts.length} transactions`);
        await this.applyRules({trx: trx, includeProcessed: false, includeTransactionsWithRuleSet: false});
      }
      return inserts;
    });
  },

  async updateTransaction(idTransaction, data, idUser) {
    return this.knex.transaction(async (trx) => {
      const result = await trx.select().table('Fk_Transaction').where({id: idTransaction});
      if (result.length !== 1) {
        throw new Error(`Transaction with id ${idTransaction} does not exist`, {cause: 'unknown'});
      }
      let confirmed;
      if (idUser !== undefined && data.confirmed !== undefined) {
        confirmed = data.confirmed;
        delete data.confirmed;
      }
      const updateData = _.omitBy({
        bookingDate: data.t_booking_date,
        valueDate: data.t_value_date,
        text: data.t_text,
        entryText: data.t_entry_text,
        amount: data.t_amount,
        notes: data.t_notes,
        payee: data.t_payee,
        primaNotaNo: data.t_primaNotaNo,
        payeePayerAcctNo: data.t_payeePayerAcctNo,
        gvCode: data.t_gvCode,
        processed: data.t_processed,
        idCategory: data.category_id,
        idAccount: data.account_id,
      }, _.isUndefined);

      if (confirmed !== undefined) {
        const result = await trx.table('Fk_TransactionStatus')
        .where('idTransaction', idTransaction)
        .andWhere('idUser', idUser)
        .update({'confirmed': confirmed})
        .returning('idTransaction');
        if (result.length === 0 && confirmed) {
          await trx.table('Fk_TransactionStatus').insert({
            idTransaction: idTransaction,
            idUser: idUser,
            confirmed: confirmed
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        const fixedUpdateData = this._fixTransactionData(updateData);
        await trx.table('Fk_Transaction').where('id', idTransaction).update(fixedUpdateData);
      }
    });
  },

  async deleteTransaction(idTransaction) {
    return this.knex.table('Fk_Transaction').where('id', idTransaction).delete();
  },

};

export default DbMixinTransactions;
