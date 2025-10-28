import _ from 'lodash';
import {DateTime} from 'luxon';
import hat from 'hat';
import crypto from 'crypto';
import config from './config.js';

const UserDatabaseMixin = {
  getMixinName() { return 'UserDatabaseMixin'; },

  UserTypes: {interactive: 'interactive', api: 'api'},

  async addUser(email, passwordSalt, passwordHash) {
    const user = {
      Email: email,
      EmailConfirmed: false,
      PasswordSalt: passwordSalt,
      PasswordHash: passwordHash,
      ExpiredAfter: DateTime.now().plus({ days: 7 }).toISO(),
      LoginProvider: 'local',
      LoginProviderKey: '',
      Type: this.UserTypes.interactive,
    };
    const result = await this.knex('Users').insert(user).returning('id');
    return result[0].id;
  },

  addUserFromBackup(users) {
    const usersToImport = users.map((user) => {
      return {
        Email: user.Email,
        EmailConfirmed: user.EmailConfirmed,
        PasswordSalt: user.PasswordSalt,
        PasswordHash: user.PasswordHash,
        ExpiredAfter: user.ExpiredAfter,
        LoginProvider: user.LoginProvider,
        LoginProviderKey: user.LoginProviderKey,
        Initials: user.Initials,
        Type: user.Type,
      };
    });
    return this.knex('Users').insert(usersToImport).returning('*');
  },

  _createPasswordHash(password, salt) {
    // Hashing user's salt and password with 1000 iterations, 64 length and sha512 digest
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return passwordHash;
  },

  async createUser(email, password) {
    if (email === 'undefined' || !email) {
      throw new Error('email undefined');
    }
    if (password === 'undefined' || !password) {
      throw new Error('password undefined');
    }
    let result = await this.knex.select()
      .table('Users')
      .where({ Email: email, EmailConfirmed: false });
    if (result.length > 0) {
      const ids = _.map(result, (user) => user.id);
      await this.deleteUsers(ids);
    }
    result = await this.knex.select()
      .table('Users')
      .where({ Email: email });
    if (result.length > 0) {
      throw new Error('Can\'t create user, because user with same email already exists', { cause: 'exists' });
    }

    const salt = crypto.randomBytes(32).toString('base64');
    const passwordHash = this._createPasswordHash(password, salt);

    return this.addUser(email, salt, passwordHash);
  },

  async createRoleEmpty(name) {
    if (!name) {
      throw new Error('Role name must be specified', { cause: 'undefined' });
    }
    let result = await this.knex.select().table('Roles').where({ Name: name });
    if (result.length > 0) {
      throw new Error(`Can't create role ${name}, because role with same name already exists`, { cause: 'exists' });
    }
    result = await this.knex('Roles').insert({ Name: name }).returning('id');
    return result[0].id;
  },

  async updateRoleNameById(roleId, roleName) {
    const result = await this.knex.select().table('Roles').where({ id: roleId });
    if (result.length !== 1) {
      throw new Error(`Role with id ${roleId} does not exist`, { cause: 'unknown' });
    }
    return this.knex.table('Roles').where('id', roleId).update({ Name: roleName });
  },

  async deleteRole(roleId) {
    let result = await this.knex('Roles').where({ id: roleId });
    if (result.length === 0) {
      throw new Error(`Role with id ${roleId} does not exist and therefore can't be deleted`, { cause: 'unknown' });
    }
    result = await this.knex('UserRoles').where({ idRole: roleId });
    if (result.length > 0) {
      throw new Error(`Role with id ${roleId} is assigned to at least one user and can't be deleted`, { cause: 'constrain' });
    }

    // unassign any Permission Profiles from this role
    await this.setPermissionProfileAssignmentsForRole(roleId, []);

    result = await this.knex('Roles').where({ id: roleId }).delete().returning('id');
    if (result.length === 0) {
      throw new Error(`Role with id ${roleId} can't be deleted for unknown reason`, { cause: 'unknown' });
    }
    console.log(`Deleted role with roleId: ${roleId}`);
  },

  async setPermissionProfiles(permissions) {
    if (!_.isObject(permissions)) {
      throw new Error('basePermissions must be an object', { cause: 'invalid' });
    }
    return this.knex.transaction(async (trx) => {
      await trx('Permission').delete();
      await trx('MenuPermission').delete();
      await trx('PermissionProfiles').delete();

      const allPermissionProfiles = [];
      const allPermissions = [];
      const allMenuPermissions = [];
      const permissionProfileKeys = Object.keys(permissions);
      permissionProfileKeys.forEach((key) => {
        const permissionDef = permissions[key];
        allPermissionProfiles.push(
          {
            idPermissionProfile: key,
            description: permissionDef.description,
          },
        );

        permissionDef.menus.forEach((menu) => {
          allMenuPermissions.push({
            idPermissionProfile: key,
            Menu: menu,
          });
        });

        permissionDef.resources.forEach((resource) => {
          permissionDef.methods.forEach((method) => {
            allPermissions.push(
              {
                idPermissionProfile: key,
                Resource: resource,
                Method: method,
              },
            );
          });
        });
      });

      let inserts = await trx('PermissionProfiles').insert(allPermissionProfiles).returning('idPermissionProfile');
      console.log(`Inserted ${inserts.length} PermissionProfiles`);

      inserts = await trx('Permission').insert(allPermissions).returning('idPermissionProfile');
      console.log(`Inserted ${inserts.length} Permissions`);

      inserts = await trx('MenuPermission').insert(allMenuPermissions).returning('idPermissionProfile');
      console.log(`Inserted ${inserts.length} MenuPermissions`);
    });
  },

  async setPermissionProfileAssignmentsForRole(role, permissionProfileIds) {
    if (!role) {
      throw new Error('Role must be specified (name or id)', { cause: 'undefined' });
    }
    if (!_.isArray(permissionProfileIds)) {
      throw new Error('permissionProfileIds must be an array', { cause: 'invalid' });
    }

    return this.knex.transaction(async (trx) => {
      const result = await trx('Roles')
        .where((builder) => {
          if (_.isString(role)) {
            const roleAsInt = parseInt(role, 10);
            if (roleAsInt.toString() === role) {
              builder.where({ id: roleAsInt });
            } else {
              builder.where({ Name: role });
            }
          } else {
            builder.where({ id: role });
          }
        });
      if (result.length === 0) {
        throw new Error(`Unknown role ${role}`, { cause: 'unknown' });
      }
      const roleId = result[0].id;
      await trx('RolePermissionProfiles').where('idRole', roleId).delete();

      if (permissionProfileIds.length > 0) {
        const rolePermissionProfiles = permissionProfileIds
          .map((id) => ({ idRole: roleId, idPermissionProfile: id }));
        const inserts = await trx('RolePermissionProfiles').insert(rolePermissionProfiles).returning(
          'idPermissionProfile',
        );
        console.log(`Inserted ${inserts.length} RolePermissionProfiles for role ${role}`);
      }
    });
  },

  async assignRoleToUser(roleId, userId) {
    const result = await this.knex('UserRoles').insert({ idUser: userId, idRole: roleId }).returning('id');
    console.log(`Inserted ${result.length} UserRoles for userId: ${userId}, roleId: ${roleId}`);
  },

  async unassignRoleFromUser(roleId, userId) {
    const result = await this.knex('UserRoles').where({ idUser: userId, idRole: roleId }).delete();
    console.log(`Deleted ${result.length} UserRoles for userId: ${userId}, roleId: ${roleId}`);
  },

  async getRolesOfUser(userId) {
    return this.knex('UserRoles').where({ idUser: userId });
  },

  async setRoleAssignmentsForUser(userId, roleIds) {
    return this.knex.transaction(async (trx) => {
      await trx('UserRoles').where({ idUser: userId }).delete();

      const allUserRoles = roleIds.map((roleId) => ({ idUser: userId, idRole: roleId }));

      if (allUserRoles.length > 0) {
        const inserts = await trx('UserRoles').insert(allUserRoles).returning('id');
        console.log(`Inserted ${inserts.length} UserRoles for userId ${userId}`);
      }

      return trx('UserRoles').where({ idUser: userId });
    });
  },

  async checkUserIsAllowed(userId, resource, method) {
    const now = DateTime.now();

    const queryResult = await this.knex.select(
      'Users.id as userId',
      'Users.Email',
      'Users.EmailConfirmed',
      'Users.Initials',
      'Users.ExpiredAfter',
      'Users.LoginProvider',
      'Users.PasswordSalt',
      'UserRoles.idRole',
      'Permission.Resource',
      'Permission.Method',
    ).from('Users')
      .join('UserRoles', function () {
        this.on('Users.id', '=', 'UserRoles.idUser');
      })
      .join('RolePermissionProfiles', function () {
        this.on('UserRoles.idRole', '=', 'RolePermissionProfiles.idRole');
      })
      .join('Permission', function () {
        this.on('RolePermissionProfiles.idPermissionProfile', '=', 'Permission.idPermissionProfile');
      })
      .where({ 'Permission.Resource': resource, 'Permission.Method': method })
      .andWhere(function () {
        this.whereNull('Users.ExpiredAfter');
        this.orWhere('Users.ExpiredAfter', '>', now.toISO());
      })
      .andWhere({ 'Users.id': userId });

    return queryResult.length > 0;
  },

  async getUsersPermissions(userId) {
    const now = DateTime.now();
    const queryResult = await this.knex
      .select(
        'MenuPermission.Menu',
      )
      .from('Users')
      .join('UserRoles', function () {
        this.on('Users.id', '=', 'UserRoles.idUser');
      })
      .join('RolePermissionProfiles', function () {
        this.on('UserRoles.idRole', '=', 'RolePermissionProfiles.idRole');
      })
      .join('MenuPermission', function () {
        this.on('RolePermissionProfiles.idPermissionProfile', '=', 'MenuPermission.idPermissionProfile');
      })
      .where(function () {
        this.whereNull('Users.ExpiredAfter');
        this.orWhere('Users.ExpiredAfter', '>', now.toISO());
      })
      .andWhere({ 'Users.id': userId });

    return queryResult;
  },

  async getRoles() {
    const result = await this.knex.select().table('Roles');
    return _.map(result, (r) => this._extractSaveRoleData(r));
  },

  async getPermissionProfilesForRole(idRole) {
    if (!idRole) {
      throw new Error('Undefined idRole');
    }
    return this.knex.select().table('RolePermissionProfiles').where({ idRole });
  },

  async getPermissionProfiles() {
    return this.knex.select().table('PermissionProfiles').orderBy('Description');
  },

  async getUser() {
    const result = await this.knex.select(['Users.*', 'Roles.id as idRole', 'Roles.Name as RoleName']).table('Users')
      .join('UserRoles', function () {
        this.on('Users.id', '=', 'UserRoles.idUser');
      })
      .leftJoin('Roles', function () {
        this.on('UserRoles.idRole', '=', 'Roles.id');
      });
    const users = new Map();
    result.forEach((userWithRole) => {
      let user;
      if (users.has(userWithRole.id)) {
        user = users.get(userWithRole.id);
      } else {
        user = {
        ...this._extractSaveUserData(userWithRole),
          Roles: [],
        };
        users.set(userWithRole.id, user);
      }
      if (userWithRole.idRole) {
        user.Roles.push({
          id: userWithRole.idRole,
          Name: userWithRole.RoleName,
        });
      }
    });
    return Array.from(users.values());
  },

  async getUserForBackup() {
    const result = await this.knex.select().table('Users');
    return _.map(result, (r) => {
      return r;
    });
  },

  async getUserById(id) {
    if (id === undefined) {
      throw new Error('Undefined user id');
    }
    const result = await this.knex.select().table('Users').where({ id });
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    }
    throw new Error(`User with id ${id} does not exist`);
  },

  async existsUserById(id) {
    const result = await this.knex.select().table('Users').where({ id });
    return result.length === 1;
  },

  async getUserByEmail(email) {
    const result = await this.knex.select().table('Users').where({ Email: email });
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    }
    throw new Error(`User with email ${email} does not exist`);
  },

  _updateUser(existingUserData, data) {
    const updateData = data;
    if (data.ExpiredAfter) {
      if (!DateTime.isDateTime(data.ExpiredAfter)) {
        throw new Error('ExpiredAfter must be DateTime');
      }
      updateData.ExpiredAfter = data.ExpiredAfter.toISO();
    }
    if (data.EmailConfirmed) {
      updateData.EmailConfirmed = data.EmailConfirmed;
    }
    if (data.Initials) {
      updateData.Initials = data.Initials;
    }
    if (data.Password) {
      const salt = existingUserData.PasswordSalt;
      updateData.PasswordHash = this._createPasswordHash(data.Password, salt);
      delete updateData.Password;
    }
    return this.knex.table('Users').where('id', existingUserData.id).update(updateData);
  },

  async updateUserById(userId, data) {
    const result = await this.knex.select().table('Users').where({ id: userId });
    if (result.length !== 1) {
      throw new Error(`User with id ${userId} does not exist`);
    }
    const updateData = {};
    if (data.Email !== undefined) {
      updateData.Email = data.Email;
    }
    if (data.Password !== undefined) {
      updateData.Password = data.Password;
    }
    if (data.EmailConfirmed !== undefined) {
      updateData.EmailConfirmed = data.EmailConfirmed;
    }
    if (data.ExpiredAfter !== undefined) {
      updateData.ExpiredAfter = DateTime.fromISO(data.ExpiredAfter);
    }
    if (data.Initials !== undefined) {
      updateData.Initials = data.Initials;
    }
    return this._updateUser(result[0], updateData);
  },

  async updateUserByEmail(email, data) {
    const result = await this.knex.select().table('Users').where({ Email: email });
    if (result.length !== 1) {
      throw new Error(`User with email ${email} does not exist`);
    }
    const updateData = {};
    if (data.Email !== undefined) {
      updateData.Email = data.Email;
    }
    if (data.EmailConfirmed !== undefined) {
      updateData.EmailConfirmed = data.EmailConfirmed;
    }
    if (data.ExpiredAfter !== undefined) {
      updateData.ExpiredAfter = DateTime.fromISO(data.ExpiredAfter);
    }
    if (data.Initials !== undefined) {
      updateData.Initials = data.Initials;
    }
    return this._updateUser(result[0], updateData);
  },

  async deleteUsers(userIds) {
    return this.knex.table('Users').whereIn('id', userIds).delete();
  },

  async getUserByAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error("Can't get user by undefined access token.");
    }
    if (!_.isString(accessToken)) {
      throw new Error("Can't get user by non-string access token.");
    }

    try {
      const queryResult = await this.knex.select(
        'Users.id',
        'Users.Email',
        'Users.EmailConfirmed',
        'Users.Initials',
        'Users.LoginProvider',
        'Users.PasswordSalt',
        'Users.ExpiredAfter',
        'UserAccessTokens.AccessToken',
        'UserAccessTokens.AccessTokenExpiredAfter',
      ).from('UserAccessTokens')
        .join('Users', function () {
          this.on('Users.id', '=', 'UserAccessTokens.idUser');
        }).where(function () {
          this.where('AccessToken', accessToken);
        });

      if (_.isArray(queryResult) && queryResult.length > 0) {
        const saveUserData = this._extractSaveUserData(queryResult[0]);
        saveUserData.AccessTokenExpiredAfter = DateTime.fromISO(
          queryResult[0].AccessTokenExpiredAfter,
        );
        return saveUserData;
      }
    } catch (ex) {
      console.log('Selecting user by access token failed:');
      console.log(ex);
      throw ex;
    }
    console.log('User with access token ', accessToken, ' does not exist.');
    return undefined;
  },

  isExpired(user) {
    const expiredAfter = DateTime.fromISO(user.ExpiredAfter);
    if (!DateTime.isDateTime(expiredAfter)) {
      throw new Error('must be DateTime', { cause: 'type' });
    }
    if (expiredAfter) {
      return DateTime.now() > expiredAfter;
    }
    return false;
  },

  async validateUser(email, password) {
    const result = await this.knex.select()
      .table('Users')
      .where({ Email: email });
    if (result.length === 0) {
      throw new Error(`Unknown user with email ${email}`, { cause: 'unknown' });
    }
    const user = result[0];
    const salt = user.PasswordSalt;
    const hash = Buffer.from(user.PasswordHash, 'hex');

    if (this.isExpired(user)) {
      throw new Error(`User with email ${email} is expired`, { cause: 'expired' });
    }
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
    if (crypto.timingSafeEqual(hash, passwordHash)) {
      return this._extractSaveUserData(user);
    }
    throw new Error(`Wrong password for user ${email}`, { cause: 'invalid' });
  },

  async createAccessTokenForUser(userId) {
    let user;

    // check if user with given id exists
    try {
      user = await this.getUserById(userId);
    } catch (ex) {
      console.log(`Exception while getUserById(${userId}): ${ex.message}`);
      throw ex;
    }

    // check if user is not expired
    if (this.isExpired(user)) {
      const errorMessage = `User with id ${userId}, email ${user.Email} is expired`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }

    // create and save access token
    const { tokenLifetimeInMinutes } = config;
    const accessToken = hat().toString('base64');
    const refreshToken = hat().toString('base64');
    const tokenData = {
      idUser: userId,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      AccessTokenExpiredAfter: DateTime.now().plus({ minutes: tokenLifetimeInMinutes }).toISO(),
    };

    await this.knex('UserAccessTokens').insert(tokenData);

    return tokenData;
  },

  async deleteAccessTokensForUser(userId) {
    let user;

    // check if user with given id exists
    try {
      user = await this.getUserById(userId);
    } catch (ex) {
      console.log(`Exception while getUserById(${userId}): ${ex.message}`);
      throw ex;
    }

    const result = this.knex.table('UserAccessTokens').where({ idUser: user.id }).delete();
    return result;
  },

  async deleteAccessToken(accessToken) {
    const result = this.knex.table('UserAccessTokens').where({ AccessToken: accessToken }).delete();
    return result;
  },

  async refreshAccessToken(accessToken, refreshToken) {
    if (!accessToken || !refreshToken) {
      throw new Error("accessToken can't be undefined", { cause: 'undefined' });
    }
    let result = this.knex.table('UserAccessTokens').where({
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    });
    if (result.length === 0) {
      throw new Error('Unknown access token', { cause: 'unknown' });
    }
    const accessTokenInfo = result[0];
    if (accessTokenInfo.RefreshToken !== refreshToken) {
      throw new Error('Refresh token invalid', { cause: 'invalid' });
    }

    // create and save access token
    const { tokenLifetimeInMinutes } = config;
    const newAccessToken = hat().toString('base64');
    const updateData = {
      AccessToken: newAccessToken,
      AccessTokenExpiredAfter: DateTime.now().plus({ minutes: tokenLifetimeInMinutes }).toISO(),
    };

    result = this.knex.table('UserAccessTokens').where('AccessToken', accessToken).update(updateData);
    return result;
  },

  _extractSaveUserData(user) {
    const data = _.pick(user, ['id', 'Email', 'EmailConfirmed', 'Initials', 'LoginProvider', 'PasswordSalt', 'Type']);
    data.ExpiredAfter = DateTime.fromISO(user.ExpiredAfter);
    data.EmailConfirmed = user.EmailConfirmed === 1 || user.EmailConfirmed === true;
    return data;
  },

  _extractSaveRoleData(user) {
    return _.pick(user, ['id', 'Name']);
  },

};

export default UserDatabaseMixin;
