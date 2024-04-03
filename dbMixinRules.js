const DbMixinRules = {
  getMixinName() {
    return 'DbMixinRules';
  },

  _selectRules: async function (idRuleSet) {
    return this.knex.transaction(async (trx) => {
      const ruleSets = await trx.table('Fk_RuleSet')
      .where((builder) => {
          if (idRuleSet !== undefined) {
            builder.where({id: idRuleSet});
          }
        }
      );
      for (const ruleSet of ruleSets) {
        ruleSet.textRules = await trx.table('Fk_RuleText').where({idRuleSet: ruleSet.id});
        ruleSet.accountRules = await trx.table('Fk_RuleAccount').where({idRuleSet: ruleSet.id});
      }
      return ruleSets;
    });
  },

  async getRuleSets() {
    return this._selectRules();
  },

  async getRuleSet(idRuleSet) {
    if (!idRuleSet) {
      throw new Error('Undefined idRuleSet');
    }
    return this._selectRules(idRuleSet);
  },


  async createRuleSet(existingTrx, ruleInfo) {
    if (!ruleInfo) {
      throw new Error(`ruleInfo must be specified`, {cause: 'unknown'});
    }
    if (!ruleInfo.name) {
      throw new Error(`ruleInfo.name must be specified`, {cause: 'unknown'});
    }
    const trx = existingTrx ? existingTrx : await this.knex.transaction();
    return new Promise(async (resolve, reject) => {
      try {
        const ruleSetInsertData = {};
        if (ruleInfo.name) {
          ruleSetInsertData.name = ruleInfo.name;
        }
        if (ruleInfo.set_note) {
          ruleSetInsertData.set_note = ruleInfo.set_note;
        }
        if (ruleInfo.idSetCategory !== undefined) {
          ruleSetInsertData.idSetCategory = ruleInfo.idSetCategory;
        }
        if (ruleInfo.is_MREF !== undefined) {
          ruleSetInsertData.is_MREF = ruleInfo.is_MREF;
        }
        if (ruleInfo.is_amount_min !== undefined) {
          ruleSetInsertData.is_amount_min = ruleInfo.is_amount_min;
        }
        if (ruleInfo.is_amount_max !== undefined) {
          ruleSetInsertData.is_amount_max = ruleInfo.is_amount_max;
        }
        const result = await trx.table('Fk_RuleSet').insert(ruleSetInsertData).returning('id');
        const idRuleSet = result[0].id;

        if (ruleInfo.textRules) {
          if (ruleInfo.textRules.length > 0) {
            const textRulesInsertData = ruleInfo.textRules.map(text => {
              return {
                idRuleSet: idRuleSet,
                text: text,
              }
            });
            await trx.table('Fk_RuleText').insert(textRulesInsertData);
          }
        }

        if (ruleInfo.accountRules) {
          if (ruleInfo.accountRules.length > 0) {
            const accountRulesInsertData = ruleInfo.accountRules.map(idAccount => {
              return {
                idRuleSet: idRuleSet,
                idAccount: idAccount,
              }
            });
            await trx.table('Fk_RuleAccount').insert(accountRulesInsertData);
          }
        }
        if (!existingTrx) {
          trx.commit();
        }
        resolve(idRuleSet);
      } catch (ex) {
        if (!existingTrx) {
          trx.rollback();
        }
        reject(ex);
      }
    });
  },

  async updateRuleSet(existingTrx, ruleInfo, removeFromTransactions) {
    if (!ruleInfo || !ruleInfo.id) {
      throw new Error(`id of RuleSet must be specified`, {cause: 'unknown'});
    }
    const trx = existingTrx ? existingTrx : await this.knex.transaction();
    return new Promise(async (resolve, reject) => {
      try {
        const result = await trx.select().table('Fk_RuleSet').where({id: ruleInfo.id});
        if (result.length !== 1) {
          throw new Error(`RuleSet with id ${ruleInfo.id} does not exist`, {cause: 'unknown'});
        }

        const ruleSetUpdateInfo = {};
        if (ruleInfo.name) {
          ruleSetUpdateInfo.name = ruleInfo.name;
        }
        if (ruleInfo.set_note !== undefined) {
          if (ruleInfo.set_note === '') {
            ruleSetUpdateInfo.set_note = null;
          } else {
            ruleSetUpdateInfo.set_note = ruleInfo.set_note;
          }
        }
        if (ruleInfo.idSetCategory !== undefined) {
          ruleSetUpdateInfo.idSetCategory = ruleInfo.idSetCategory;
        }
        if (ruleInfo.is_MREF !== undefined) {
          if (ruleInfo.is_MREF === '') {
            ruleSetUpdateInfo.is_MREF = null;
          } else {
            ruleSetUpdateInfo.is_MREF = ruleInfo.is_MREF;
          }
        }
        if (ruleInfo.is_amount_min !== undefined) {
          ruleSetUpdateInfo.is_amount_min = ruleInfo.is_amount_min;
        }
        if (ruleInfo.is_amount_max !== undefined) {
          ruleSetUpdateInfo.is_amount_max = ruleInfo.is_amount_max;
        }
        await trx.table('Fk_RuleSet').where('id', ruleInfo.id).update(ruleSetUpdateInfo);

        if (ruleInfo.textRules) {
          await trx.table('Fk_RuleText').where('idRuleSet', ruleInfo.id).delete();
          if (ruleInfo.textRules.length > 0) {
            const textRulesInsertData = ruleInfo.textRules.map(text => {
              return {
                idRuleSet: ruleInfo.id,
                text: text,
              }
            });
            await trx.table('Fk_RuleText').insert(textRulesInsertData);
          }
        }

        if (ruleInfo.accountRules) {
          await trx.table('Fk_RuleAccount').where('idRuleSet', ruleInfo.id).delete();
          if (ruleInfo.accountRules.length > 0) {
            const accountRulesInsertData = ruleInfo.accountRules.map(idAccount => {
              return {
                idRuleSet: ruleInfo.id,
                idAccount: idAccount,
              }
            });
            await trx.table('Fk_RuleAccount').insert(accountRulesInsertData);
          }
        }

        if (removeFromTransactions) {
          await trx.table('Fk_Transaction').where('idRuleSet', ruleInfo.id).update({idRuleSet: null, processed: false});
        }
        if (!existingTrx) {
          trx.commit();
        }
        resolve();
      } catch (ex) {
        if (!existingTrx) {
          trx.rollback();
        }
        reject(ex);
      }
    });
  },

  async deleteRuleSet(id) {
    if (!id) {
      throw new Error(`id of RuleSet must be specified`, {cause: 'unknown'});
    }
    return this.knex.transaction(async (trx) => {

      const result = await trx.select().table('Fk_RuleSet').where({id: id});
      if (result.length !== 1) {
        throw new Error(`RuleSet with id ${id} does not exist`, {cause: 'unknown'});
      }

      await trx.table('Fk_RuleText').where('idRuleSet', id).delete();
      await trx.table('Fk_RuleAccount').where('idRuleSet', id).delete();
      await trx.table('Fk_Transaction').where('idRuleSet', id).update({idRuleSet: null});
      await trx.table('Fk_RuleSet').where('id', id).delete();
    });
  }
};

export default DbMixinRules;
