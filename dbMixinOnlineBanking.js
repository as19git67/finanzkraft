import _ from 'lodash';

const DbMixinOnlineBanking = {
  getMixinName() {
    return 'DbMixinOnlineBanking';
  },

  async getBankcontacts() {
    return this.knex.table('Fk_Bankcontact').orderBy('Fk_Bankcontact.name');
  },

  async getBankcontact(id) {
    return this.knex.table('Fk_Bankcontact').where('id', id);
  },

  async addBankcontact(data) {
    const dbData = _.pick(data, 'name', 'fintsUrl', 'fintsBankId', 'fintsUserId', 'fintsPasswordEncrypted');
    const result = await this.knex('Fk_Bankcontact').insert(dbData).returning('*');
    if (result.length > 0) {
      return result[0];
    } else {
      return undefined;
    }
  },

  async updateBankcontact(idBankcontact, data) {
    const result = await this.knex.select().table('Fk_Bankcontact').where({id: idBankcontact});
    if (result.length !== 1) {
      throw new Error(`Bankcontact with id ${idBankcontact} does not exist`, {cause: 'exists'});
    }
    const updateData = _.pick(data, 'name', 'fintsUrl', 'fintsBankId', 'fintsUserId', 'fintsPasswordEncrypted');
    return this.knex.table('Fk_Bankcontact').where('id', idBankcontact).update(updateData);
  },

  async deleteCurrency(idBankcontact) {
    return this.knex.table('Fk_Bankcontact').where('id', idBankcontact).delete();
  },

};

export default DbMixinOnlineBanking;
