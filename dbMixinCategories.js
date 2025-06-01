import _ from 'lodash';

const DbMixinCategories = {
  getMixinName() {
    return 'DbMixinCategories';
  },

  _selectCategories: function (idCategory) {
    return this.knex.table('Fk_Category')
    .leftJoin('Fk_Category as parentCat', function () {
      this.on('parentCat.id', '=', 'Fk_Category.idCategoryParent');
    })
    .whereNotNull('Fk_Category.idCategoryParent')
    .andWhere((builder) => {
        if (idCategory !== undefined) {
          builder.where({id: idCategory});
        }
      }
    )
    .orderBy('parentCat.name', 'asc')
    .orderBy('Fk_Category.name', 'asc')
    .select(['Fk_Category.id as id', 'parentCat.name as parent_name', 'Fk_Category.name as name', 'Fk_Category.fullName as full_name']);
  },

  async getCategories() {
    return this._selectCategories();
  },

  async getCategory(idCategory) {
    if (!idCategory) {
      throw new Error('Undefined idCategory');
    }
    return this._selectCategories(idCategory);
  },

  async addCategory(idCategoryParent, name) {
    let parentCategoryName = '';
    if (idCategoryParent) {
      const resultParentCategory = await this.knex.table('Fk_Category').where({id: idCategoryParent}).select('Fk_Category.name');
      if (resultParentCategory.length > 0) {
        parentCategoryName = resultParentCategory[0].name;
      }
    }
    const fullName = parentCategoryName ? `${parentCategoryName}:${name}` : name;
    const result = await this.knex('Fk_Category').insert({
      name: name,
      fullName: fullName,
      idCategoryParent: idCategoryParent
    }).returning('id');
    if (result.length > 0) {
      return result[0].id;
    } else {
      return undefined;
    }
  },

  async getOrCreateCategory(category) {
    if (!_.isString(category)) {
      throw new Error('category must be string');
    }
    const parts = category.split(':');
    if (parts.length > 1) {
      const parentCategoryName = parts[0].trim();
      const categoryName = parts[1].trim();
      try {
        const result = await this.knex.table('Fk_Category as cat')
        .join('Fk_Category as parentCat', function () {
          this.on('parentCat.id', '=', 'cat.idCategoryParent');
        })
        .where('parentCat.name', '=', parentCategoryName)
        .andWhere('cat.name', '=', categoryName)
        .select('cat.id');

        if (result.length > 0) {
          return result[0].id;
        } else {
          let parentCategoryId;
          const resultParentCategory = await this.knex.table('Fk_Category').where({name: parentCategoryName}).select('Fk_Category.id');
          if (resultParentCategory.length === 0) {
            parentCategoryId = await this.addCategory(undefined, parentCategoryName);
          } else {
            parentCategoryId = resultParentCategory[0].id;
          }

          let categoryId;
          const resultCategory = await this.knex.table('Fk_Category').where({
            name: categoryName,
            idCategoryParent: parentCategoryId
          }).select('Fk_Category.id');
          if (resultCategory.length === 0) {
            categoryId = await this.addCategory(parentCategoryId, categoryName);
          } else {
            categoryId = resultCategory[0].id;
          }
          return categoryId;
        }
      } catch (ex) {
        console.error(ex);
        throw ex;
      }

    } else {
      const categoryName = parts[0].trim();
      let categoryId;
      const resultCategory = await this.knex.table('Fk_Category').where({
        name: categoryName,
        idCategoryParent: null
      }).select('Fk_Category.id');
      if (resultCategory.length === 0) {
        categoryId = await this.addCategory(undefined, categoryName);
      } else {
        categoryId = resultCategory[0].id;
      }
      return categoryId;
    }
  },

  async updateCategory(idCategory, data) {
    const result = await this.knex.select().table('Fk_Category').where({id: idCategory});
    if (result.length !== 1) {
      throw new Error(`Category with id ${idCategory} does not exist`);
    }
    const updateData = _.pick(data, 'name', 'idCategoryParent');
    return this.knex.table('Fk_Category').where('id', idCategory).update(updateData);
  },

  async deleteCategory(idCategory) {
    return this.knex.table('Fk_Category').where('id', idCategory).delete();
  },

};

export default DbMixinCategories;
