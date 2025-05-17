import _ from 'lodash';

const DbMixinPrefsNewTransactionPresets = {
  key: 'NewTransactionPresets',
  
  getMixinName() {
    return 'DbMixinPrefsNewTransactionPresets';
  },

  _selectNewTransactionPresets: async function (userId, idPreset) {
    const presets = await this.knex.table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId);
    if (idPreset) {
      const preset = presets.find((p) => p.id === idPreset);
      return [preset];
    }
    return presets;
  },

  async getNewTransactionPresets(userId) {
    return this._selectNewTransactionPresets(userId);
  },
  
  async addNewTransactionPresets(userId, presets) {
    const result = await this.knex('Preferences').insert({
      idUser: userId,
      key: this.key,
      value: presets,
      description: 'Array of new-transaction presets',
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async updateNewTransactionPresets(userId, updateData) {
    const result = await this.knex.select().table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId);
    if (result.length !== 1) {
      throw new Error(`Preference with key ${this.key} does not exist`);
    }
    const idPreset = result[0].id;
    const data = _.pick(updateData, 'value', 'description');
    return this.knex.table('Preferences')
      .where('id', idPreset)
      .update(data);
  },

  async deleteNewTransactionPresets(userId) {
    return this.knex.table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId)
      .delete();
  },

};

export default DbMixinPrefsNewTransactionPresets;
