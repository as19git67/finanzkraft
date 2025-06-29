import _ from 'lodash';

const DbMixinPrefsNewTransactionPresets = {
  key: 'NewTransactionPresets',
  
  getMixinName() {
    return 'DbMixinPrefsNewTransactionPresets';
  },

  _selectNewTransactionPresets: async function (userId) {
    const result = await this.knex.table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId);
    if (result.length !== 1) {
      return '[]';
    }
    return result[0].value;
  },

  async getNewTransactionPresets(userId) {
    return this._selectNewTransactionPresets(userId);
  },
  
  async addNewTransactionPresets(userId, presets) {
    const result = await this.knex('Preferences').insert({
      idUser: userId,
      key: this.key,
      value: JSON.stringify(presets),
      description: 'Array of new-transaction presets',
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async updateNewTransactionPresets(userId, presets) {
    const result = await this.knex.select().table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId);
    if (result.length !== 1) {
      return this.addNewTransactionPresets(userId, presets);
    }
    const idPreset = result[0].id;
    return this.knex.table('Preferences')
      .where('id', idPreset)
      .update({value: JSON.stringify(presets)});
  },

  async deleteNewTransactionPresets(userId) {
    return this.knex.table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId)
      .delete();
  },

};

export default DbMixinPrefsNewTransactionPresets;
