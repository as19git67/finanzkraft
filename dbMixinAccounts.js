import _ from 'lodash';

const DbMixinAccounts = {
  getMixinName(){ return 'DbMixinAccounts'; },

  async getAccounts() {
    return this.knex.select().table('Fk_Account');
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
