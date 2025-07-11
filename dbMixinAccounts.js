import _ from "lodash";

const DbMixinAccounts = {
  getMixinName() {
    return 'DbMixinAccounts';
  },

  async getAccounts() {
    return this.knex
    .with('numbered_balances', (qb) => {
      qb.select('*').rowNumber('row_number', function () {
        this.orderBy('balanceDate', 'desc').partitionBy('idAccount');
      }).from('Fk_AccountBalance');
    })
    .with('last_balances', (qb) => {
      qb.select('*')
      .from('numbered_balances')
      .where('row_number', 1);
    })
    .select( [
      'Fk_Account.id as id',
      'Fk_Account.name',
      'Fk_Account.iban',
      'Fk_Account.number',
      'Fk_Account.startBalance',
      'Fk_Account.idAccountType as account_type_id',
      'Fk_Account.closedAt',
      'Fk_Currency.id as currency_id',
      'Fk_Currency.name as currency_name',
      'Fk_Currency.short as currency_short',
      'last_balances.balanceDate',
      'last_balances.balance',
      'reader',
      'writer'
    ])
    .from('Fk_Account')
    .leftJoin('last_balances', function() {
      this.on('Fk_Account.id', '=', 'last_balances.idAccount');
    })
    .leftJoin('Fk_Currency', function () {
      this.on('Fk_Account.idCurrency', '=', 'Fk_Currency.id');
    })
    .leftJoin(this.knex.raw("(select FK_AccountReader.idAccount, STRING_AGG(FK_AccountReader.idUser, ',') as reader from Fk_AccountReader group by idAccount) as Fk_AccountReader_agg on Fk_Account.id = Fk_AccountReader_agg.idAccount"))
    .leftJoin(this.knex.raw("(select FK_AccountWriter.idAccount, STRING_AGG(FK_AccountWriter.idUser, ',') as writer from FK_AccountWriter group by idAccount) as FK_AccountWriter_agg on Fk_Account.id = FK_AccountWriter_agg.idAccount"))
    .orderBy('closedAt', 'asc')
    .orderBy('Fk_Account.name', 'asc')
  },

  async addAccount(accountData) {
    const result = await this.knex('Fk_Account').insert(accountData).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async getAccount(idAccount) {
    if (!idAccount) {
      throw new Error('Undefined idAccount', { cause: 'unknown' });
    }
    return this.knex.select().table('Fk_Account').where({id: idAccount});
  },

  async updateAccount(idAccount, data) {
    const result = await this.knex.select().table('Fk_Account').where({id: idAccount});
    if (result.length !== 1) {
      throw new Error(`Account with id ${idAccount} does not exist`, {cause: 'unknown'});
    }
    const updateData = _.pick(data, 'name', 'iban', 'idAccountType', 'idCurrency', 'startBalance', 'closedAt');
    return this.knex.transaction(async (trx) => {
      let result;
      if (Object.keys(updateData).length > 0) {
        result = await trx.table('Fk_Account').where('id', idAccount).update(updateData);
        if (result !== 1) {
          throw new Error(`Account with id ${idAccount} was not updated`, {cause: 'unknown'});
        }
      }
      if (data.readers) {
        result = await trx.table('Fk_AccountReader').where('idAccount', idAccount).delete();
        for (const idUser of data.readers) {
          result = await trx.table('Fk_AccountReader').insert({idAccount: idAccount, idUser: idUser});
        }
      }
      if (data.writers) {
        result = await trx.table('Fk_AccountWriter').where('idAccount', idAccount).delete();
        for (const idUser of data.writers) {
          result = await trx.table('Fk_AccountWriter').insert({idAccount: idAccount, idUser: idUser});
        }
      }
    });
  },

  async deleteAccount(idAccount) {
    return this.knex.table('Fk_Account').whereIn('id', idAccount).delete();
  },

};

export default DbMixinAccounts;
