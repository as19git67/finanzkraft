import _ from 'lodash';

const DbMixinTransactions = {
  getMixinName() {
    return 'DbMixinTransactions';
  },

  _selectTransactions: function (idTransaction) {
    return this.knex.table('Fk_Transaction')
    .join('Fk_Currency', function () {
      this.on('Fk_Transaction.amountCurrency', '=', 'Fk_Currency.id');
    })
    .join('Fk_Account', function () {
      this.on('Fk_Transaction.idAccount', '=', 'Fk_Account.id');
    })
    .leftJoin('Fk_Category', function () {
      this.on('Fk_Transaction.idCategory', '=', 'Fk_Category.id');
    })
    .where((builder) => {
        if (idTransaction !== undefined) {
          builder.where({id: idTransaction});
        }
      }
    )
    .orderBy('Fk_Transaction.valueDate', 'desc')
    .select([
      'Fk_Account.id as account_id', 'Fk_Account.name as account_name', 'Fk_Transaction.id as t_id',
      'Fk_Transaction.bookingDate as t_booking_date', 'Fk_Transaction.valueDate as t_value_date',
      'Fk_Transaction.text as t_text', 'Fk_Transaction.amount as t_amount', 'Fk_Transaction.notes as t_notes',
      'Fk_Category.id as category_id', 'Fk_Category.name as category_name', 'Fk_Currency.name as' +
      ' currency_name', 'Fk_Currency.short as currency_short']);
  },

  async getTransactions() {
    return this._selectTransactions();
  },

  async getTransaction(idTransaction) {
    if (!idTransaction) {
      throw new Error('Undefined idTransaction');
    }
    return this._selectTransactions(idTransaction);
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
    return this.knex.table('Fk_Transaction').whereIn('id', idTransaction).delete();
  },

};

export default DbMixinTransactions;
