import _ from 'lodash';

const DbMixinTransactions = {
  getMixinName() {
    return 'DbMixinTransactions';
  },

  _selectTransactions: function (idTransaction, maxItems, searchTerm, accountsWhereIn) {
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
        builder.where({id: idTransaction});
      }
    })
    .andWhere((builder) => {
      if (searchTerm) {
        if (_.isString(searchTerm)) {
          const trimmedSearchTerm = searchTerm.trim();
          builder.whereLike('Fk_Transaction.text', `%${trimmedSearchTerm}%`);
          builder.orWhereLike('Fk_Transaction.notes', `%${trimmedSearchTerm}%`);
          builder.orWhereLike('Fk_Transaction.payee', `%${trimmedSearchTerm}%`);
          builder.orWhereLike('Fk_Category.fullName', `%${trimmedSearchTerm}%`);
        }
        const amount = parseFloat(searchTerm);
        if (amount) {
          builder.orWhere('Fk_Transaction.amount', amount);
          builder.orWhere('Fk_Transaction.amount', amount * -1);
        }
      }
    })
    .orderBy('Fk_Transaction.valueDate', 'desc')
    .select([
      'Fk_Account.id as account_id', 'Fk_Account.name as account_name', 'Fk_Transaction.id as t_id',
      'Fk_Transaction.bookingDate as t_booking_date', 'Fk_Transaction.valueDate as t_value_date',
      'Fk_Transaction.text as t_text', 'Fk_Transaction.amount as t_amount', 'Fk_Transaction.notes as t_notes',
      'Fk_Category.id as category_id', 'Fk_Category.fullName as category_name',
      'Fk_Currency.id as currency_id', 'Fk_Currency.name as currency_name', 'Fk_Currency.short as currency_short']);
    if (maxItems) {
      builder.limit(maxItems);
    }
    return builder;
  },

  async getTransactions(maxItems, searchTerm, accountsWhereIn) {
    return this._selectTransactions(undefined, maxItems, searchTerm, accountsWhereIn);
  },

  async getTransaction(idTransaction) {
    if (!idTransaction) {
      throw new Error('Undefined idTransaction');
    }
    return this._selectTransactions(idTransaction);
  },

  async addTransaction(transactionData) {
    return this.knex('Fk_Transaction').insert(transactionData).returning('id');
  },

  async updateTransaction(idTransaction, data) {
    const result = await this.knex.select().table('Fk_Transaction').where({id: idTransaction});
    if (result.length !== 1) {
      throw new Error(`Transaction with id ${idTransaction} does not exist`);
    }
    const updateData = _.pick(data, 'idAccount', 'bookingDate', 'valueDate', 'amount', 'amountCurrency', 'text', 'notes', 'idCategory');
    return this.knex.table('Fk_Transaction').where('id', idTransaction).update(updateData);
  },

  async deleteAccount(idTransaction) {
    return this.knex.table('Fk_Transaction').where('id', idTransaction).delete();
  },

};

export default DbMixinTransactions;
