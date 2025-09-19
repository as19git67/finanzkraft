import _ from 'lodash';

const DbMixinSystemPreferences = {
  keyEncryptionPublicKey: 'EncryptionPublicKey',
  keyEncryptionPrivateKey: 'EncryptionPrivateKey',

  getMixinName() {
    return 'DbMixinSystemPreferences';
  },

  getSystemPreferences() {
    return this.knex.table('SystemPreferences');
  },

  async getSystemPreference(key) {
    const result = await this.knex.table('SystemPreferences').where('key', key)
    if (result.length !== 1) {
      return undefined;
    }
    return result[0];
  },

  async addSystemPreference(key, value, description) {
    if (!_.isString(value)) {
      throw new Error('value must be string');
    }
    const result = await this.knex('SystemPreferences').insert({
      key: key,
      value: value,
      description: description,
    }).returning('key');
    if (result.length > 0) {
      return result[0].key;
    } else {
      return undefined;
    }
  },

  async updateSystemPreference(key, value, description) {
    const result = await this.knex.select().table('SystemPreferences')
      .where('key', key)
    if (result.length !== 1) {
      return this.addPreference(key, value, description);
    }
    return this.knex.table('SystemPreferences')
      .where('key', key)
      .update({value: value, description: description});
  },

  async deleteSystemPreference(key) {
    return this.knex.table('SystemPreferences')
      .where('key', key)
      .delete();
  },

};

export default DbMixinSystemPreferences;
