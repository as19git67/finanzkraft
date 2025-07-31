import _ from 'lodash';
import NumberParser from './NumberParser.js';

const DbMixinTransactions = {
  _maxTextToken: 20,

  getMixinName() {
    return 'DbMixinTransactions';
  },

  _selectTransactions: function (idTransaction, maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, amountMin, amountMax, textToken, mRefToken) {
    const np = new NumberParser();
    const amountMinParsed = np.parse(amountMin);
    const amountMaxParsed = np.parse(amountMax);

    const columnsToSelect = [
      'Fk_Account.id as account_id', 'Fk_Account.name as account_name', 'Fk_Transaction.id as t_id',
      'Fk_Transaction.bookingDate as t_booking_date', 'Fk_Transaction.valueDate as t_value_date',
      'Fk_Transaction.text as t_text',
      'Fk_Transaction.EREF as t_EREF',
      'Fk_Transaction.CRED as t_CRED',
      'Fk_Transaction.MREF as t_MREF',
      'Fk_Transaction.ABWA as t_ABWA',
      'Fk_Transaction.ABWE as t_ABWE',
      'Fk_Transaction.IBAN as t_IBAN',
      'Fk_Transaction.BIC as t_BIC',
      'Fk_Transaction.REF as t_REF',
      'Fk_Transaction.entryText as t_entry_text', 'Fk_Transaction.amount as t_amount',
      'Fk_Transaction.notes as t_notes', 'Fk_Transaction.payee as t_payee', 'Fk_Transaction.primaNotaNo as t_primaNotaNo',
      'Fk_Transaction.payeePayerAcctNo as t_payeePayerAcctNo', 'Fk_Transaction.gvCode as t_gvCode',
      'Fk_Transaction.processed as t_processed', 'Fk_Category.id as category_id',
      'Fk_Category.fullName as category_name', 'Fk_Currency.id as currency_id',
      'Fk_Transaction.idRuleSet as rule_set_id', 'Fk_RuleSet.name as rule_set_name',
      'Fk_Currency.name as currency_name', 'Fk_Currency.short as currency_short',
      'tagIds', 'tags'];
    if (idUser) {
      columnsToSelect.push('Fk_TransactionStatus.unseen as unseen');
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
    .leftJoin(this.knex.raw("(SELECT Fk_TagTransaction.idTransaction, STRING_AGG(Fk_Tag.id, ',') as tagIds, STRING_AGG(Fk_Tag.tag, ',') as tags FROM Fk_TagTransaction JOIN Fk_Tag ON Fk_TagTransaction.idTag = Fk_Tag.id GROUP BY Fk_TagTransaction.idTransaction) AS Fk_Tag_agg ON Fk_Transaction.id = Fk_Tag_agg.idTransaction"))
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
      if (_.isString(mRefToken) && mRefToken) {
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
            builder.orWhereILike('Fk_Transaction.ABWA', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.ABWE', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.IBAN', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.BIC', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.REF', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Transaction.payee', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('Fk_Category.fullName', `%${trimmedSearchTerm}%`);
            builder.orWhereILike('tags', `%${trimmedSearchTerm}%`);
          } else {
            builder.whereLike('Fk_Transaction.text', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.EREF', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.CRED', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.MREF', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.ABWA', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.ABWE', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.IBAN', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.BIC', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.REF', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.notes', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Transaction.payee', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('Fk_Category.fullName', `%${trimmedSearchTerm}%`);
            builder.orWhereLike('tags', `%${trimmedSearchTerm}%`);
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
        builder.andWhere('valueDate', '>=', dateFilterFrom);
      }
      if (dateFilterTo) {
        builder.andWhere('valueDate', '<=', dateFilterTo);
      }
    })
    .andWhere((builder) => {
      if (NumberParser.isNumber(amountMinParsed)) {
        builder.andWhere('amount', '>=', amountMinParsed);
      }
      if (NumberParser.isNumber(amountMaxParsed)) {
        builder.andWhere('amount', '<=', amountMaxParsed);
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

  async getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, amountMin, amountMax, textToken, mRefToken) {
    return this._selectTransactions(undefined, maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo, idUser, amountMin, amountMax, textToken, mRefToken);
  },

  async getTransactionsForExport() {
    try {
      const results = await this.knex.table('Fk_Transaction')
        .select(['Fk_Transaction.id as Fk_Transaction:id', 'Fk_Transaction.*', 'Fk_Account.id as Fk_Account:id', 'Fk_Account.name as Fk_Account:name', 'Fk_Account.iban as Fk_Account:iban', 'Fk_Account.*', 'Fk_Currency.id as Fk_Currency:id', 'Fk_Currency.name as Fk_Currency:name', 'Fk_Currency.*', 'Fk_Category.id as Fk_Category:id', 'Fk_Category.name as Fk_Category:name', 'Fk_Category.*', 'Fk_RuleSet.id as Fk_RuleSet:id', 'Fk_RuleSet.name as Fk_RuleSet:name', 'Fk_RuleSet.*', 'Fk_Tags:tags'])
        .join('Fk_Account', function () {
          this.on('Fk_Transaction.idAccount', '=', 'Fk_Account.id');
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
        .leftJoin(this.knex.raw("(SELECT Fk_TagTransaction.idTransaction, STRING_AGG(Fk_Tag.tag, '|') as 'Fk_Tags:tags' FROM Fk_TagTransaction JOIN Fk_Tag ON Fk_TagTransaction.idTag = Fk_Tag.id GROUP BY Fk_TagTransaction.idTransaction) AS Fk_Tag_agg ON Fk_Transaction.id = Fk_Tag_agg.idTransaction"))
      return results.map((t) => {
        let tableName = '';
        for (const tKey in t) {
          if (_.isArray(t[tKey])) {
            delete t[tKey];
            continue;
          }
          const i = tKey.indexOf(':');
          if (i > 0) {
            const parts = tKey.split(':');
            tableName = parts[0];
            if (t[tKey] == null) {
              delete t[tKey];
            }
          } else {
            if (t[tKey] === null) {
              delete t[tKey];
            } else {
              t[tableName + ':' + tKey] = t[tKey];
              delete t[tKey];
            }
          }
        }
        return t;
      });
    } catch(ex) {
      console.log(ex);
      throw ex;
    }
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

  _parseText: function (parsed, text, markers, key, mustHaveAlreadyParsedKeys = []) {
    const currentKey = _.find(parsed, { key: key });
    if (currentKey) {
      return; // key found in parsed => skip this
    }
    for (const mustHaveAlreadyParsedKey of mustHaveAlreadyParsedKeys) {
      const mustHave = _.find(parsed, { key: mustHaveAlreadyParsedKey });
      if (!mustHave) {
        return; // key not found => skip this
      }
    }
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

  _fixBIC: function (tRet) {
    if (tRet.BIC) {
      let i = tRet.BIC.indexOf('(');
      if (i >= 0) {
        tRet.BIC = tRet.BIC.substring(0, i).trim();
      } else {
        i = tRet.BIC.indexOf(';');
        if (i >= 0) {
          tRet.BIC = tRet.BIC.substring(0, i).trim();
        } else {
          i = tRet.BIC.indexOf(',');
          if (i >= 0) {
            tRet.BIC = tRet.BIC.substring(0, i).trim();
          }
        }
      }
    }
  },

  // Convert empty values to undefined for having null in DB and parse ABWE, ABWA, ANAM, BNAM, BIC, IBAN, Ref, CRED, SVWZ, EREF
  _fixTransactionData: function (t) {
    const tRet = t;
    if (t.processed === undefined) {
      tRet.processed = false;
    }
    if (_.isString(t.text) && t.text.trim().length === 0) {
      tRet.text = null;
    } else {
      if (_.isString(tRet.text)) {
        const parts = [];
        this._parseText(parts, tRet.text, ['ABWE:', 'ABWE+', 'A BWE:', 'AB WE:', 'ABW E:', 'ABWE :'], 'ABWE');
        this._parseText(parts, tRet.text, ['ABWA:', 'ABWE+', 'A BWA:', 'AB WA:', 'ABW A:', 'ABWA :', ' ABWA '], 'ABWA');
        this._parseText(parts, tRet.text, ['ANAM:', 'A NAM:', 'AN AM:', 'ANA M:', 'ANAM :'], 'ANAM');
        this._parseText(parts, tRet.text, ['BNAM:', 'B NAM:', 'BN AM:', 'BNA M:', 'BNAM :'], 'BNAM');
        this._parseText(parts, tRet.text, ['BIC:', 'B IC:', 'BI C:', 'BIC :', 'BIC '], 'BIC');
        this._parseText(parts, tRet.text, ['IBAN:', 'I BAN:', 'IB AN:', 'IBA N:', 'IBAN :'], 'IBAN');
        this._parseText(parts, tRet.text, ['IBAN '], 'IBAN', ['BIC']);
        this._parseText(parts, tRet.text, ['Ref.'], 'REF');
        this._parseText(parts, tRet.text, ['GLÄUBIGER-ID:', 'CRED:', 'C RED:', 'CR ED:', 'CRE D:', 'CRED :', 'CRED' ], 'CRED');
        this._parseText(parts, tRet.text, ['CORE / MANDATSREF.:', 'COR1 / MANDATSREF.:', 'MREF:', 'M REF:', 'MR EF:', 'MRE F:', 'MREF :', 'MREF '], 'MREF');
        this._parseText(parts, tRet.text, ['SVWZ:', 'S VWZ:', 'SV WZ:', 'SVW Z:', 'SVWZ :'], 'SVWZ');
        this._parseText(parts, tRet.text, ['END-TO-END-REF.:', 'EREF:', 'E REF:', 'ER EF:', 'ERE F:', 'EREF :', ' EREF '], 'EREF');
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
              case 'BNAM':
                // ignore this, because it duplicates payee
                break;
              case 'EREF':
                part = part.replace(/\s+/g, '');
                if (part !== 'NICHTANGEGEBEN' && part !== 'NICHT ANGEGEBEN' && part !== 'NOTPROVIDED') {
                  // store only if not not-provided
                  tRet[partInfo.key] = part;
                }
                break;
              case 'ABWE':
              case 'ABWA':
                if (part !== 'NICHTANGEGEBEN' && part !== 'NICHT ANGEGEBEN' && part !== 'NOTPROVIDED') {
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
          this._fixBIC(tRet);
          if (tRet.SVWZ) {
            tRet.text = tRet.SVWZ + ' ' + tRet.text;  // insert SEPA Verwendungszweck at beginning of text
            delete tRet.SVWZ;
          }
          tRet.text = tRet.text.trim();
        }
      }
    }
    if (_.isString(t.payee) && t.payee.trim().length === 0) {
      tRet.payee = null;
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
    const ruleSets = await trx.select(['Fk_RuleSet.id as idRuleSet', 'Fk_RuleSet.name as RuleSetName', 'idSetCategory',
      'set_note', 'is_MREF', 'is_amount_min', 'is_amount_max']).count({TextRuleCount: 'Fk_RuleText.idRuleSet'})
    .table('Fk_RuleSet')
    .leftJoin('Fk_RuleText', function() {
      this.on('Fk_RuleSet.id', 'Fk_RuleText.idRuleSet');
    })
    .where(function() {
      if (idRuleSet != null) {
        this.where('Fk_RuleSet.id', idRuleSet);
      }
    })
    .groupBy(['Fk_RuleText.idRuleSet', 'Fk_RuleSet.id', 'Fk_RuleSet.name', 'idSetCategory', 'set_note', 'is_MREF', 'is_amount_min', 'is_amount_max']);

    const joinRaw = this.supportsILike() ? "JOIN Fk_RuleText RT ON Fk_Transaction.text LIKE '%' + RT.text + '%'" : "JOIN Fk_RuleText RT ON Fk_Transaction.text LIKE '%' || RT.text || '%'";

    console.log(`Checking ${ruleSets.length} rule sets for matches...`);
    for (const ruleSet of ruleSets) {
      console.log(`Rule set ${ruleSet.idRuleSet}: '${ruleSet.RuleSetName}' (TextRuleCount: ${ruleSet.TextRuleCount})`);
      const queryBuilder = trx.table('Fk_Transaction')
      .select(['Fk_Transaction.id as t_id', 'Fk_Transaction.text', 'Fk_Transaction.amount', 'Fk_Transaction.MREF', 'Fk_Transaction.notes', 'Fk_Transaction.idCategory', 'Fk_Transaction.processed', 'Fk_Transaction.idRuleSet']);
      if (ruleSet.TextRuleCount > 0) {
        queryBuilder.count({TextRuleMatches: 'Fk_Transaction.id'});
        queryBuilder.joinRaw(joinRaw + ` and RT.idRuleSet = ${ruleSet.idRuleSet}`);
      }
      if (ruleSet.is_MREF != null) {
        queryBuilder.andWhere('Fk_Transaction.MREF', ruleSet.is_MREF);
      }
      if (ruleSet.is_amount_min != null) {
        queryBuilder.andWhere('Fk_Transaction.amount', '>=', ruleSet.is_amount_min);
      }
      if (ruleSet.is_amount_max != null) {
        queryBuilder.andWhere('Fk_Transaction.amount', '<=', ruleSet.is_amount_max);
      }
      if (!includeProcessed) {
        queryBuilder.andWhere('Fk_Transaction.processed', false);
      }
      if (!includeTransactionsWithRuleSet) {
        queryBuilder.whereNull('Fk_Transaction.idRuleSet');
      }
      if (ruleSet.TextRuleCount > 0) {
        queryBuilder.groupBy(['Fk_Transaction.id', 'Fk_Transaction.text', 'Fk_Transaction.amount', 'Fk_Transaction.MREF', 'Fk_Transaction.notes', 'Fk_Transaction.idCategory', 'Fk_Transaction.processed', 'Fk_Transaction.idRuleSet']);
      }
      const matchingTransactions = await queryBuilder;
      console.log(`Selected ${matchingTransactions.length} matching transactions`);
      if (matchingTransactions.length > 100 && ruleSet.is_MREF == null && ruleSet.TextRuleCount === 0) {
        throw new Error(`Can't apply rule, because it would match too many transactions, which might be wrong`);
      }

      for (const m of matchingTransactions) {
        const textRuleCount = ruleSet.TextRuleCount;
        if (textRuleCount > 0) {
          const matches = m.TextRuleMatches;
          if (matches < textRuleCount) {
            console.log(`TextRuleMatches: ${matches} is less than number of text rules: ${textRuleCount} => skip`);
            continue; // skip updating the transaction, because not all text rule matches
          }
        }
        const updateData = {
          processed: true,
          idRuleSet: ruleSet.idRuleSet,
        };
        if (ruleSet.set_note) {
          updateData.notes = ruleSet.set_note;
        }
        if (ruleSet.idSetCategory) {
          updateData.idCategory = ruleSet.idSetCategory;
        }
        await trx.table('Fk_Transaction').where('id', m.t_id).update(updateData);
        console.log(`Updated transaction ${m.t_id} with category: ${updateData.idCategory}, notes ${updateData.notes}`);
      }
    }
  },

  async applyRules(trx, options) {
    const o = options ? options : {};
    const idRuleSet = o.idRuleSet;
    const includeProcessed = o.includeProcessed;
    const includeTransactionsWithRuleSet = o.includeTransactionsWithRuleSet;
    const minMatchRate = o.minMatchRate ? o.minMatchRate : 100;
    if (trx) {
      await this._applyRulesInTrx(trx, idRuleSet, includeProcessed, includeTransactionsWithRuleSet, minMatchRate);
    } else {
      const newTrx = await this.knex.transaction();
      return new Promise(async (resolve, reject) => {
        this._applyRulesInTrx(newTrx, idRuleSet, includeProcessed, includeTransactionsWithRuleSet, minMatchRate).then(() => {
          newTrx.commit();
          resolve();
        })
        .catch(reason => {
          newTrx.rollback();
          reject(reason);
        });
      });
    }
  },

  async addTransaction(transactionData, options = {}) {
    let transactionDataForInsert;
    if (options.dontFix) {
      transactionDataForInsert = transactionData;
    } else {
      transactionDataForInsert = this._fixTransactionData(transactionData);
    }
    return this.knex.transaction(async (trx) => {
      let inserts = await trx('Fk_Transaction').insert(transactionDataForInsert).returning('id');
      if (inserts.length !== 1) {
        throw new Error(`Unexpected number of inserted transactions: ${inserts.length}. Should be 1.`);
      }
      const idTransaction = inserts[0].id;
      if (!options.ignoreRules) {
        await this.applyRules(trx, {includeProcessed: false, includeTransactionsWithRuleSet: false});
      }
      if (options.balance) {
        const balanceInserts = await trx('Fk_AccountBalance').insert(options.balance);
      }
      if (options.tags && options.tags.length > 0) {
        const transactionTagsToInsert = options.tags.map((idTag) => {
          return {
            idTransaction: idTransaction,
            idTag: idTag,
          }
        });
        const tagInserts = await trx('Fk_TagTransaction').insert(transactionTagsToInsert);
      }
      return inserts;
    });
  },

  async addTransactions(transactions, options = {}) {
    const trToInsert = transactions.map((t) => {
      return this._fixTransactionData(t);
    });
    return this.knex.transaction(async (trx) => {
      let inserts = [];
      if (trToInsert.length > 0) {
        inserts = await trx('Fk_Transaction').insert(trToInsert).returning('*');
        console.log(`Inserted ${inserts.length} transactions`);
        if (!options || !options.ignoreRules) {
          await this.applyRules(trx, {includeProcessed: false, includeTransactionsWithRuleSet: false});
        }
        if (options.unconfirmed) {
          const users = await trx('Users').where({Type: this.UserTypes.interactive});
          const trStatusesForAllUsersToInsert = [];
          for (const user of users) {
            const trStatusesToInsert = inserts.map((t) => {
              return {
                idTransaction: t.id,
                idUser: user.id,
                unseen: true,
              };
            });
            trStatusesForAllUsersToInsert.concat(trStatusesToInsert);
          }
          const res = await trx('Fk_TransactionStatus').insert(trStatusesForAllUsersToInsert);
          console.log(`Inserted ${res.length} transaction statuses`);
        }
        if (options.balance) {
          const result = await trx('Fk_AccountBalance').where({idAccount: options.balance.idAccount, balanceDate: options.balance.balanceDate});
          if (result.length > 0) {
            // update instead of insert
            // let balanceUpdates = await trx('Fk_AccountBalance').update(options.balance);
            // console.log(`Updated ${balanceUpdates.length} account balances`);
            let balanceDeletions = await trx('Fk_AccountBalance').
                where({
                  idAccount: options.balance.idAccount,
                  balanceDate: options.balance.balanceDate
                }).
                delete();
            console.log(`${balanceDeletions} balance deletions`);
          }
          let balanceInserts = await trx('Fk_AccountBalance').insert(options.balance);
          console.log(`Inserted ${balanceInserts.length} account balances`);
        }
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

      let unseen;
      if (idUser !== undefined && data.unseen !== undefined) {
        unseen = data.unseen;
      }
      delete data.unseen;

      if (data.tagIds) {
        const tagsToInsert = data.tagIds.map((idTag) => {
          return {
            idTransaction: idTransaction,
            idTag: idTag,
          };
        });
        await trx.table('Fk_TagTransaction').where({idTransaction: idTransaction}).delete();
        const result = await trx.table('Fk_TagTransaction').insert(tagsToInsert).returning('*');
        console.log(`Inserted ${result.length} tags for transaction ${idTransaction}`);
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

      if (unseen !== undefined) {
        await trx.table('Fk_TransactionStatus')
          .where('idTransaction', idTransaction)
          .andWhere('idUser', idUser)
          .delete();
        if (unseen) {
          await trx.table('Fk_TransactionStatus').insert({
            idTransaction: idTransaction,
            idUser: idUser,
            unseen: true,
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        const fixedUpdateData = this._fixTransactionData(updateData);
        await trx.table('Fk_Transaction').where('id', idTransaction).update(fixedUpdateData);
      }
    });
  },

  deleteTransaction(idTransaction) {
    return this.knex.transaction(async (trx) => {
      await trx.table('Fk_TransactionStatus').
          where('idTransaction', idTransaction).
          delete();
      await trx.table('Fk_Transaction').
          where('id', idTransaction).
          delete();
    });
  },
};

export default DbMixinTransactions;
