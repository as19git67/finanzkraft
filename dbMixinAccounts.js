import _ from 'lodash';

const DbMixinAccounts = {
  getMixinName(){ return 'DbMixinAccounts'; },

  async getAccounts() {
    return this.knex.select().table('Fk_Account')
        .join('Fk_Currency', function () {
          this.on('Fk_Account.idCurrency', '=', 'Fk_Currency.id');
        })
        .select(['Fk_Account.id as id', 'Fk_Account.name as name', 'Fk_Account.iban as iban', 'Fk_Currency.id as currency_id', 'Fk_Currency.name as' +
                                                                 ' currency_name', 'Fk_Currency.short as currency_short']);
  },

  async addAccount(accountData){
    return this.knex('Fk_Account').insert(accountData).returning('id');
  },

  async getAccount(idAccount) {
    if (!idAccount) {
      throw new Error('Undefined idAccount');
    }
    return this.knex.select().table('Fk_Account').where({ id: idAccount });
  },

  async updateAccount(idAccount, data) {
    const result = await this.knex.select().table('Fk_Account').where({ id: idAccount });
    if (result.length !== 1) {
      throw new Error(`Account with id ${idAccount} does not exist`);
    }
    const updateData = {};
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.iban) {
      updateData.iban = data.iban;
    }
    return this.knex.table('Fk_Account').where('id', idAccount).update(updateData);
  },

  async deleteAccount(idAccount) {
    return this.knex.table('Fk_Account').whereIn('id', idAccount).delete();
  },

};

export default DbMixinAccounts;
