import _ from 'lodash';
import crypto from 'crypto';
import config from './config.js';

const DbMixinOnlineBanking = {
  getMixinName() {
    return 'DbMixinOnlineBanking';
  },



  // create key from password with salt
  createHashPassword(password, salt) {
    let passwordHash = crypto.pbkdf2Sync(Buffer.from(password), Buffer.from(salt), 2000000, 32, 'sha512');
    return passwordHash.toString('base64');
  },

  encrypt(publicKey, text) {
    return crypto.publicEncrypt(publicKey, Buffer.from(text)).toString('base64');
  },

  decrypt(privateKey, passphrase, salt, encryptedTextBase64) {
    const encryptedTextBuffer = Buffer.from(encryptedTextBase64, 'base64');
    const passphraseHash = this.createHashPassword(passphrase, salt)
    return crypto.privateDecrypt({ key: privateKey, passphrase: passphraseHash }, encryptedTextBuffer).toString();
  },

  async getBankcontacts() {
    const {privateKeyPassphrase} = config;
    let pref = await this.getSystemPreference(this.keyEncryptionPrivateKey);
    const privateKey = pref?.value;
    pref = await this.getSystemPreference(this.keyPassphraseSalt);
    const salt = pref?.value;

    const result = await this.knex.table('Fk_Bankcontact').orderBy('Fk_Bankcontact.name');

    return _.map(result, (bankcontact) => {
      const bc = _.pick(bankcontact, 'id', 'name', 'fintsUrl', 'fintsBankId', 'fintsUserIdEncrypted', 'fintsPasswordEncrypted');
     if (bankcontact.fintsUserIdEncrypted) {
        if (privateKeyPassphrase && privateKey && salt) {
          try {
            bc.fintsUserId = this.decrypt(privateKey, privateKeyPassphrase, salt, bankcontact.fintsUserIdEncrypted);
          } catch (e) {
            console.error(`Error decrypting fintsUserIdEncrypted for bankcontact id ${bankcontact.id}: ${e.message}`);
          }
          // note, that the password is decrypted when used to download bank statements
        } else {
          console.error(`No private key, passphrase or salt found. Not importing encrypted fintsUserid or fintsPassword for bankcontact ${bankcontact.name}`);
        }
      }

      return bc;
    });
  },

  async getBankcontact(id) {
    const idBankcontact = parseInt(id);
    if (idBankcontact === undefined) {
      throw new Error('Undefined idBankcontact', { cause: 'invalid' });
    }
    const result = await this.knex.table('Fk_Bankcontact').where('id', idBankcontact);
    if (result.length === 1) {
      const bankcontact = result[0];

      if (bankcontact.fintsUserIdEncrypted || bankcontact.fintsPasswordEncrypted) {
        const {privateKeyPassphrase} = config;
        if (!privateKeyPassphrase) {
          throw new Error('No private key passphrase found in settings', { cause: 'invalid' });
        }
        let result = await this.knex.table('SystemPreferences').where('key', this.keyEncryptionPrivateKey);
        if (result.length !== 1) {
          throw new Error('No private key found in system preferences', { cause: 'invalid' });
        }
        const privateKey = result[0].value;
        result = await this.knex.table('SystemPreferences').where('key', this.keyPassphraseSalt);
        if (result.length !== 1) {
          throw new Error('No passphrase salt found in system preferences', { cause: 'invalid' });
        }
        const salt = result[0].value;

        if (bankcontact.fintsUserIdEncrypted) {
          bankcontact.fintsUserId = this.decrypt(privateKey, privateKeyPassphrase, salt, bankcontact.fintsUserIdEncrypted);
        }
        if (bankcontact.fintsPasswordEncrypted) {
          bankcontact.fintsPassword = this.decrypt(privateKey, privateKeyPassphrase, salt, bankcontact.fintsPasswordEncrypted);
        }
      }
      return bankcontact;
    }
    return undefined;
  },

  async addBankcontact(data) {
    const dbData = _.pick(data, 'name', 'fintsUrl', 'fintsBankId');
    await this.updateWithEncrypted(data, dbData);
    const result = await this.knex('Fk_Bankcontact').insert(dbData).returning('*');
    if (result.length > 0) {
      return result[0];
    } else {
      return undefined;
    }
  },

  async updateBankcontact(idBankcontact, data) {
    const result = await this.knex.select().table('Fk_Bankcontact').where({id: idBankcontact});
    if (result.length !== 1) {
      throw new Error(`Bankcontact with id ${idBankcontact} does not exist`, {cause: 'exists'});
    }
    const updateData = _.pick(data, 'name', 'fintsUrl', 'fintsBankId');
    await this.updateWithEncrypted(data, updateData);
    return this.knex.table('Fk_Bankcontact').where('id', idBankcontact).update(updateData);
  },

  async deleteBankcontact(idBankcontact) {
    return this.knex.table('Fk_Bankcontact').where('id', idBankcontact).delete();
  },


  async updateWithEncrypted(data, updateData) {
    let publicKey;

    async function setPublicKey() {
      if (!publicKey) {
        const pref = await this.getSystemPreference(this.keyEncryptionPublicKey);
        publicKey = pref.value;
      }
    }

    const fields = ['fintsUserId', 'fintsPassword'];
    for (const field of fields) {
      if (data[field] !== undefined) {
        if (data[field]) {
          await setPublicKey.call(this);
          updateData[`${field}Encrypted`] = this.encrypt(publicKey, data[field]);
        } else {
          updateData[`${field}Encrypted`] = null;
        }
      } else {
        // use already encrypted data if available
        if (data[`${field}Encrypted`]) {
          updateData[`${field}Encrypted`] = data[`${field}Encrypted`];
        }
      }
    }
  },

};

export default DbMixinOnlineBanking;
