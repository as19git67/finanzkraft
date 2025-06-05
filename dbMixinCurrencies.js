import _ from 'lodash';

const DbMixinCurrencies = {
  getMixinName() {
    return 'DbMixinCurrencies';
  },

  async getCurrencies() {
    return this.knex.table('Fk_Currency').orderBy('Fk_Currency.name', 'asc');
  },

  async addCurrency(id, name, short) {
    const result = await this.knex('Fk_Currency').insert({
      id: id,
      name: name,
      short: short,
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async updateCurrency(idCurrency, data) {
    const result = await this.knex.select().table('Fk_Currency').where({id: idCurrency});
    if (result.length !== 1) {
      throw new Error(`Currency with id ${idCurrency} does not exist`);
    }
    const updateData = _.pick(data, 'name', 'short');
    return this.knex.table('idCurrency').where('id', idCurrency).update(updateData);
  },

  async deleteCurrency(idCurrency) {
    return this.knex.table('Fk_Currency').where('id', idCurrency).delete();
  },

};

export default DbMixinCurrencies;
