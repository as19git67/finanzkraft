import _ from 'lodash';

const DbMixinTransactions = {
  getMixinName() {
    return 'DbMixinTransactions';
  },

  _selectTransactions: function (idTransaction, maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo) {
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
    .where((builder) => {
      if (idTransaction !== undefined) {
        builder.where({'Fk_Transaction.id': idTransaction});
      }
    })
    .andWhere((builder) => {
      if (searchTerm) {
        if (_.isString(searchTerm)) {
          const trimmedSearchTerm = searchTerm.trim();
          builder.whereILike('Fk_Transaction.text', `%${trimmedSearchTerm}%`);
          builder.orWhereILike('Fk_Transaction.notes', `%${trimmedSearchTerm}%`);
          builder.orWhereILike('Fk_Transaction.payee', `%${trimmedSearchTerm}%`);
          builder.orWhereILike('Fk_Category.fullName', `%${trimmedSearchTerm}%`);
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
    .select([
      'Fk_Account.id as account_id', 'Fk_Account.name as account_name', 'Fk_Transaction.id as t_id',
      'Fk_Transaction.bookingDate as t_booking_date', 'Fk_Transaction.valueDate as t_value_date',
      'Fk_Transaction.text as t_text', 'Fk_Transaction.entryText as t_entry_text', 'Fk_Transaction.amount as t_amount',
      'Fk_Transaction.notes as t_notes', 'Fk_Transaction.payee as t_payee', 'Fk_Transaction.primaNotaNo as t_primaNotaNo',
      'Fk_Transaction.payeePayerAcctNo as t_payeePayerAcctNo', 'Fk_Transaction.gvCode as t_gvCode',
      'Fk_Transaction.processed as t_processed', 'Fk_Category.id as category_id',
      'Fk_Category.fullName as category_name', 'Fk_Currency.id as currency_id',
      'Fk_Currency.name as currency_name', 'Fk_Currency.short as currency_short']);
    if (maxItems) {
      builder.limit(maxItems);
    }
    return builder;
  },

  async getTransactions(maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo) {
    return this._selectTransactions(undefined, maxItems, searchTerm, accountsWhereIn, dateFilterFrom, dateFilterTo);
  },

  async getTransaction(idTransaction) {
    if (!idTransaction) {
      throw new Error('Undefined idTransaction', { cause: 'unknown' });
    }
    const results = await this._selectTransactions(idTransaction);
    if (results.length > 0) {
      return results[0];
    } else {
      throw new Error(`Transaction with id ${idTransaction} does not exist`, { cause: 'unknown' });
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
      if (trToInsert.length > 0) {
        inserts = await trx('Fk_Transaction').insert(trToInsert).returning('*');
        console.log(`Inserted ${inserts.length} transactions`);
      }
      return inserts;
    });
  },

  async updateTransaction(idTransaction, data) {
    const result = await this.knex.select().table('Fk_Transaction').where({id: idTransaction});
    if (result.length !== 1) {
      throw new Error(`Transaction with id ${idTransaction} does not exist`, { cause: 'unknown' });
    }
    const updateData = _.pick(data, 'idAccount', 'bookingDate', 'valueDate', 'amount', 'text', 'notes', 'idCategory',
      'payee', 'entryText', 'gvCode', 'primaNotaNo', 'payeePayerAcctNo');
    const fixedUpdateData = this._fixTransactionData(updateData);
    return this.knex.table('Fk_Transaction').where('id', idTransaction).update(fixedUpdateData);
  },

  async deleteAccount(idTransaction) {
    return this.knex.table('Fk_Transaction').where('id', idTransaction).delete();
  },

};

export default DbMixinTransactions;
