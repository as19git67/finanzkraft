import _ from 'lodash';

const DbMixinTimespan = {
  getMixinName() {
    return 'DbMixinTimespan';
  },

  _selectTimespans: function (idTimespan) {
    return this.knex.table('Fk_Timespan')
    .where((builder) => {
        if (idTimespan !== undefined) {
          builder.where({id: idTimespan});
        }
      }
    )
    .orderBy('Fk_Timespan.order', 'asc');
  },

  async getTimespans() {
    return this._selectTimespans();
  },

  async getTimespan(idTimespan) {
    if (!idTimespan) {
      throw new Error('Undefined idTimespan');
    }
    return this._selectTimespans(idTimespan);
  },

  async addTimespan(name, fromRuleNo, fromRuleAttribute, toRuleNo, toRuleAttribute, order) {
    const result = await this.knex('Fk_Timespan').insert({
      name: name,
      fromRuleNo: fromRuleNo,
      fromRuleAttribute: fromRuleAttribute,
      toRuleNo: toRuleNo,
      toRuleAttribute : toRuleAttribute,
      order: order
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async updateTimespan(idTimespan, data) {
    const result = await this.knex.select().table('Fk_Timespan').where({id: idTimespan});
    if (result.length !== 1) {
      throw new Error(`Timespan with id ${idTimespan} does not exist`);
    }
    const updateData = _.pick(data, 'name', 'fromRuleNo', 'fromRuleAttribute', 'toRuleNo', 'toRuleAttribute', 'order');
    return this.knex.table('Fk_Timespan').where('id', idTimespan).update(updateData);
  },

  async deleteTimespan(idTimespan) {
    return this.knex.table('Fk_Timespan').where('id', idTimespan).delete();
  },

};

export default DbMixinTimespan;
