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
      // filter presets
    }
    return presets;
  },

  async get(userId) {
    return this._selectNewTransactionPresets(userId);
  },
  
  async add(userId, presets) {
    const result = await this.knex('Preferences').insert({
      idUser: userId,
      key: this.key,
      value: presets,
      description: 'Array of new transaction presets',
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async update(userId, updateData) {
    const result = await this.knex.select().table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId);
    if (result.length !== 1) {
      throw new Error(`Preference with key ${this.key} does not exist`);
    }
    const data = _.pick(updateData, 'value', 'description');
    return this.knex.table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId)
      .update(data);
  },

  async delete(userId) {
    return this.knex.table('Preferences')
      .where('key', this.key)
      .andWhere('idUser', userId)
      .delete();
  },

};

export default DbMixinPrefsNewTransactionPresets;
