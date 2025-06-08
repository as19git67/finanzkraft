import _ from 'lodash';

const DbMixinAccountTypes = {
  getMixinName() {
    return 'DbMixinAccountTypes';
  },

  async getAccountTypes() {
    return this.knex.table('Fk_AccountType').orderBy('Fk_AccountType.order', 'asc');
  },

  async addAccountType(id, name, short) {
    const result = await this.knex('Fk_AccountType').insert({
      id: id,
      name: name,
      order: order,
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async updateCurrency(idAccountType, data) {
    const result = await this.knex.select().table('Fk_AccountType').where({id: idAccountType});
    if (result.length !== 1) {
      throw new Error(`AccountType with id ${idAccountType} does not exist`);
    }
    const updateData = _.pick(data, 'name', 'order');
    return this.knex.table('idAccountType').where('id', idAccountType).update(updateData);
  },

  async deleteCurrency(idAccountType) {
    return this.knex.table('Fk_AccountType').where('id', idAccountType).delete();
  },

};

export default DbMixinAccountTypes;
