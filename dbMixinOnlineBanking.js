import _ from 'lodash';

const DbMixinOnlineBanking = {
  getMixinName() {
    return 'DbMixinOnlineBanking';
  },

  async getBankcontacts() {
    return this.knex.table('Fk_Bankcontact').orderBy('Fk_Bankcontact.name');
  },

  async addBankcontact(name, fintsurl) {
    const result = await this.knex('Fk_Bankcontact').insert({
      name: name,
      fintsurl: fintsurl,
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async updateBankcontact(idBankcontact, data) {
    const result = await this.knex.select().table('Fk_Bankcontact').where({id: idBankcontact});
    if (result.length !== 1) {
      throw new Error(`Bankcontact with id ${idBankcontact} does not exist`);
    }
    const updateData = _.pick(data, 'name', 'fintsurl');
    return this.knex.table('Fk_Bankcontact').where('id').update(updateData);
  },

  async deleteCurrency(idBankcontact) {
    return this.knex.table('Fk_Bankcontact').where('id', idBankcontact).delete();
  },

};

export default DbMixinOnlineBanking;
