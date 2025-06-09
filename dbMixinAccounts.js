const DbMixinAccounts = {
  getMixinName() {
    return 'DbMixinAccounts';
  },

  async getAccounts() {
    return this.knex.select().table('Fk_Account')
    .join('Fk_Currency', function () {
      this.on('Fk_Account.idCurrency', '=', 'Fk_Currency.id');
    })
    .leftJoin('FK_AccountReader', function () {
      this.on('FK_AccountReader.idAccount', '=', 'Fk_Account.id');
    })
    .leftJoin('FK_AccountWriter', function () {
      this.on('FK_AccountWriter.idAccount', '=', 'Fk_Account.id');
    })
    .orderBy('closedAt', 'asc')
    .orderBy('name', 'asc')
    .groupBy('Fk_Account.id')
    .select(['Fk_Account.id as id', 'Fk_Account.name as name', 'Fk_Account.iban as iban',
      'Fk_Account.number as number', 'Fk_Account.startBalance as startBalance', 'Fk_Account.idAccountType as account_type_id',
      'Fk_Currency.id as currency_id', 'Fk_Currency.name as currency_name',
      'Fk_Currency.short as currency_short', 'Fk_Account.closedAt as closedAt',
      this.knex.raw("GROUP_CONCAT(distinct FK_AccountReader.idUser) as reader"),
      this.knex.raw("GROUP_CONCAT(distinct FK_AccountWriter.idUser) as writer"),
    ]);
  },

  async addAccount(accountData) {
    const result = await this.knex('Fk_Account').insert(accountData).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async getAccount(idAccount) {
    if (!idAccount) {
      throw new Error('Undefined idAccount', { cause: 'unknown' });
    }
    return this.knex.select().table('Fk_Account').where({id: idAccount});
  },

  async updateAccount(idAccount, data) {
    const result = await this.knex.select().table('Fk_Account').where({id: idAccount});
    if (result.length !== 1) {
      throw new Error(`Account with id ${idAccount} does not exist`, { cause: 'unknown' });
    }
    const updateData = {};
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.iban) {
      updateData.iban = data.iban;
    }
    return this.knex.table('Fk_Account').where('id', idAccount).update(updateData);
  },

  async deleteAccount(idAccount) {
    return this.knex.table('Fk_Account').whereIn('id', idAccount).delete();
  },

};

export default DbMixinAccounts;
