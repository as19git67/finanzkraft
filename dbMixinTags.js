import _ from 'lodash';

const DbMixinTags = {
  getMixinName() {
    return 'DbMixinTags';
  },

  _selectTagsByIds: function (tagIds) {
    const tagIdsAsInteger = tagIds.map(id => parseInt(id));
    return this.knex.table('Fk_Tag').whereIn('id', tagIdsAsInteger).orderBy('tag', 'asc');
  },

  _selectTagsByNames: function (tags) {
    return this.knex.table('Fk_Tag').whereIn('tag', tags).orderBy('tag', 'asc');
  },

  async getTagsByIds(tagIds = undefined) {
    return this._selectTagsByIds(tagIds);
  },

  async addTag(name) {
    const result = await this.knex('Fk_Tag').insert({
      name: name,
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async addTags(names) {
    const tagsToInsert = names.map(name => ({tag: name}));
    return this.knex('Fk_Tag').insert(tagsToInsert).returning('*');
  },

  async getOrCreateTags(tags) {
    if (!_.isArray(tags)) {
      throw new Error('tags must be array of strings');
    }
    const result = await this._selectTagsByNames(tags);
    const tagsByName = {};
    for (const tagInfo of result) {
      tagsByName[tagInfo.tag] = true;
    }
    const missingTags = [];
    for (const tag of tags) {
      if (!tagsByName[tag]) {
        missingTags.push(tag);
      }
    }
    if (missingTags.length > 0) {
      await this.addTags(missingTags);
    }
    const tagsFromDb = await this._selectTagsByNames(tags);
    return tagsFromDb.map(tag => tag.id);
  },

  updateTag(id, tag) {
    return this.knex.table('Fk_Tag').where('id', id).update({name: tag});
  },

  deleteTag(id) {
    return this.knex.table('Fk_Tag').where('id', id).delete();
  },
};

export default DbMixinTags;
