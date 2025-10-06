import yaml from 'js-yaml';
import fs from 'fs';
import role from "./routes/role.js";

export default async function importData(db, importFilename) {

  const importFunctions = {
    importUsers,
    importRoles,
    importUserRoles,
    importRolePermissionProfiles,
    importNewTransactionPresets,
    importAccounts,
    importCategories,
    importTransactions,
    importBankcontacts,
    importSystemPreferences,
  };

  let isFinanzkraftExport = false;
  const result = await db.getAccounts();
  if (result.length > 0) {
    console.log('Database has already data stored. Skip importing initial data.');
    return;
  }

  const data = yaml.load(fs.readFileSync(importFilename, 'utf8'));
  if (data.Schema) {
    console.log(`Export file is a Finanzkraft export file with schema ${data.Schema}. Importing...`);
    isFinanzkraftExport = true;
  }

  if (isFinanzkraftExport) {
    const dataToCheck = [
      'SystemPreferences',
      'Users',
      'Roles',
      'RolePermissionProfiles',
      'UserRoles',
      'NewTransactionPresets',
      'Bankcontacts',
      'Accounts',
      'Categories',
      'Transactions',
      'RuleSet',
    ];
    let dataOk = true;
    for (const part of dataToCheck) {
      if (!data[part]) {
        console.log(`Finanzkraft export file does not contain ${part} => skip importing from this file.`);
        dataOk = false;
        break;
      }
    }

    if (!dataOk) {
      for (const part of dataToCheck) {
        if (!data[part]) {
          console.log(`Finanzkraft export file does not contain ${part} => skip importing from this file.`);
          continue;
        }
        const fu = importFunctions['import' + part];
        if (!fu) {
          console.log(`Finanzkraft export file does not contain ${part} => skip importing from this file.`);
          continue;
        }
        try {
          await fu(data[part]);
        } catch (ex) {
          console.log(`Error while importing Finanzkraft export file: ${ex.message}`);
          throw new Error(`Error while importing Finanzkraft export file: ${ex.message}`);
        }
      }
      return;
    }
    return;
  }

  // await importAsMoneyExport();

  async function importUsers(users) {
    console.log(`Importing ${Object.keys(users).length} users...`);

    let res = await db.getUser();
    const userEmails = res.map(user => user.Email);

    const usersToImport = [];
    for (const user of users) {
      if (userEmails.includes(user.Email)) {
        console.log(`User ${user.Email} already exists. Skip importing.`);
      } else {
        usersToImport.push(user);
      }
    }

    if (usersToImport.length > 0) {
      res = await db.addUserFromBackup(usersToImport);
      console.log(`Imported ${Object.keys(res).length} users`);
    } else {
      console.log(`No users to import`);
    }
  }

  async function getRolesByNames() {
    const roles = await db.getRoles();
    const rolesByName = {};
    roles.forEach(role => {
      rolesByName[role.Name] = role.id;
    });
    return rolesByName;
  }

  async function importRoles(roles) {
    console.log(`Importing ${Object.keys(roles).length} roles...`);
    const rolesByName = await getRolesByNames();

    for (const role of roles) {
      if (rolesByName[role.Name]) {
        console.log(`Role ${role.Name} already exists. Skip importing.`);
        continue;
      }
      await db.createRoleEmpty(role.Name);
    }
  }

  async function importRolePermissionProfiles(rolePermissionProfiles) {
    console.log(`Importing ${Object.keys(rolePermissionProfiles).length} rolePermissionProfiles...`);
    const rolesByName = await getRolesByNames();

    for (const rolePermissionProfile of rolePermissionProfiles) {
      const roleId = rolesByName[rolePermissionProfile.role];
      await db.setPermissionProfileAssignmentsForRole(roleId, rolePermissionProfile.permissionProfiles);
      console.log(`Imported rolePermissionProfiles for role ${rolePermissionProfile.role} with ${rolePermissionProfile.permissionProfiles.length} permission profiles.`)
    }
  }

  async function importUserRoles(userRoles) {
    console.log(`Importing ${Object.keys(userRoles).length} user roles...`);
    const rolesByName = await getRolesByNames();

    for (const userRole of userRoles) {
      const email = userRole.userEmail;
      const user = await db.getUserByEmail(email);
      const assignedRoles = await db.getRolesOfUser(user.id);

      for (const role of userRole.roles) {
        const roleName = role.Name;
        const roleId = rolesByName[roleName];
        if (assignedRoles.find(role => role.idRole === roleId)) {
          console.log(`User ${email} already has role ${roleName}. Skip importing.`);
          continue;
        }
        await db.assignRoleToUser(roleId, user.id);
        console.log(`Imported user role ${roleName} for user ${email}`);
      }
    }
  }

  async function importNewTransactionPresets(newTransactionPresets) {
    console.log(`Importing ${Object.keys(newTransactionPresets).length} newTransactionPresets...`);
    for (const newTransactionPreset of newTransactionPresets) {
      const userEmail = newTransactionPreset.userEmail;
      const user = await db.getUserByEmail(userEmail);
      const validPresets = newTransactionPreset.newTransactionPresets.filter(preset => {
        return Object.keys(preset).length > 0;
      });
      const presets = [];
      for (const preset of validPresets) {
        const p = {...preset};
        p.categoryId = await db.getOrCreateCategory(preset.category);
        delete p.category;
        presets.push(p);
      }
      const res = await db.addNewTransactionPresets(user.id, presets);
      console.log(`Imported newTransactionPresets for user ${userEmail} with ${newTransactionPreset.newTransactionPresets.length} presets.`);
    }
  }

  async function importAccounts(accounts) {
    console.log(`Importing ${Object.keys(accounts).length} accounts...`);

    const bankcontacts = await db.getBankcontacts();
    const bankcontactByName = {};
    bankcontacts.forEach(bankcontact => {
      bankcontactByName[bankcontact.name] = bankcontact;
    });

    for (const account of accounts) {
      const accountId = await db.addAccount({
        name: account.name,
        iban: account.iban,
        number: account.number,
        idCurrency: account.currency_id,
        idAccountType: account.account_type_id,
        startBalance: account.startBalance,
        closedAt: account.closedAt,
        idBankcontact: bankcontactByName[account.bankcontact_name]?.id,
        fintsError: account.fintsError ? account.fintsError : '',
        fintsAccountNumber: account.fintsAccountNumber,
        fintsAuthRequired: account.fintsAuthRequired ? account.fintsAuthRequired : false,
        fintsActivated: account.fintsActivated ? account.fintsActivated : false,
      });
      console.log(`Imported account ${account.name}`);
      if (account.balanceDate && account.balance !== null) {
        const res2 = await db.addAccountBalance(accountId, account.balanceDate, account.balance);
        console.log(`Imported balance ${account.balance} for account ${account.name} on ${account.balanceDate}`);
      }

      const usersByEmail = {};
      const users = await db.getUser();
      users.forEach(user => {
        usersByEmail[user.Email] = user;
      });

      const updateData = {};
      if (account.reader.length > 0) {
        updateData.reader = account.reader.map(reader => {
          return usersByEmail[reader].id;
        });
      }
      if (account.writer.length > 0) {
        updateData.writer = account.writer.map(writer => {
          return usersByEmail[writer].id;
        });
      }
      if (Object.keys(updateData).length > 0) {
        const res3 = await db.updateAccount(accountId, updateData);
        console.log(`Imported ${account.reader.length} reader and ${account.writer.length} writer for account ${account.name}`);
      }
    }
  }

  async function importBankcontacts(bankcontacts) {
    console.log(`Importing ${Object.keys(bankcontacts).length} bankcontacts...`);

    for (const bankcontact of bankcontacts) {
      const id = await db.addBankcontact({
        name: bankcontact.name,
        fintsUrl: bankcontact.fintsUrl ? bankcontact.fintsUrl : '',
        fintsBankId: bankcontact.fintsBankId ? bankcontact.fintsBankId :  '',
        fintsUserIdEncrypted: bankcontact.fintsUserIdEncrypted ? bankcontact.fintsUserIdEncrypted :  '',
        fintsPasswordEncrypted: bankcontact.fintsPasswordEncrypted ? bankcontact.fintsPasswordEncrypted :  '',
      });
      console.log(`Imported bankcontact ${bankcontact.name}`);
    }
  }

  async function importSystemPreferences(systemPreferences) {
    console.log(`Importing ${Object.keys(systemPreferences).length} SystemPreferences...`);

    for (const p of systemPreferences) {
      await db.addSystemPreference(p.key, p.value, p.description);
      console.log(`Imported SystemPreferences ${p.key}`);
    }
  }

  async function importCategories(categories) {
    console.log(`Importing ${Object.keys(categories).length} categories...`);
    const importedCategoryIds = [];
    for (const category of categories) {
      const categoryId = await db.getOrCreateCategory(category.full_name);
      importedCategoryIds.push(categoryId);
    }
    console.log(`Imported ${importedCategoryIds.length} categories`);
  }

  async function importTransactions(transactions) {
    console.log(`Importing ${Object.keys(transactions).length} transactions...`);
    const addedTransactionIds = [];

    try {
      const accounts = await db.getAccounts();
      const accountByName = {};
      accounts.forEach(account => {
        accountByName[account.name] = account;
      });

      const categories = await db.getCategories();
      const categoriesByName = {};
      categories.forEach(category => {
        categoriesByName[category.full_name] = category;
      });

      for (const tr of transactions) {
        const accountName = tr['Fk_Account:name'];

        let categoryId = null;
        if (tr['Fk_Category:fullName']) { // if category is specified, it must be in categoriesByName
          if (!categoriesByName[tr['Fk_Category:fullName']]) {
            throw new Error(`Category ${tr['Fk_Category:fullName']} does not exist. Please import categories first.`);
          }
          categoryId = tr['Fk_Category:fullName'] ? categoriesByName[tr['Fk_Category:fullName']].id : null;
        }

        const trData = {
          idAccount: accountByName[accountName].id,
          bookingDate: null,
          valueDate: tr['Fk_Transaction:valueDate'],
          amount: tr['Fk_Transaction:amount'],
          text: tr['Fk_Transaction:text'],
          originalCurrency: tr['Fk_Transaction:originalCurrency'],
          originalAmount: tr['Fk_Transaction:originalAmount'],
          exchangeRate: tr['Fk_Transaction:exchangeRate'],
          EREF: tr['Fk_Transaction:EREF'],
          CRED: tr['Fk_Transaction:CRED'],
          MREF: tr['Fk_Transaction:MREF'],
          ABWA: tr['Fk_Transaction:ABWA'],
          ABWE: tr['Fk_Transaction:ABWE'],
          IBAN: tr['Fk_Transaction:IBAN'],
          BIC: tr['Fk_Transaction:BIC'],
          REF: tr['Fk_Transaction:REF'],
          notes: tr['Fk_Transaction:notes'],
          payee: tr['Fk_Transaction:payee'],
          payeePayerAcctNo: tr['Fk_Transaction:payeePayerAcctNo'],
          idCategory: categoryId,
          oldCategory: tr['Fk_Transaction:oldCategory'],
          entryText: tr['Fk_Transaction:entryText'],
          gvCode: tr['Fk_Transaction:gvCode'],
          primaNotaNo: tr['Fk_Transaction:primaNotaNo'],
          idRuleSet: null,
          processed: tr['Fk_Transaction:processed'],
        };

        const tagIds = tr['Fk_Tags:tags'] ? await db.getOrCreateTags(tr['Fk_Tags:tags'].split('|')) : undefined;
        const id = await db.addTransaction(trData, {tags: tagIds, ignoreRules: true, dontFix: true,});
        addedTransactionIds.push(id);
      }
      console.log(`Imported ${addedTransactionIds.length} transactions`);
    } catch (ex) {
      console.log(`Error while importing transactions: ${ex.message}`);
      throw new Error(`Error while importing transactions: ${ex.message}`);
    }
  }

  async function importAsMoneyExport() {
    console.log(`Importing accounts from ${importFilename}...`);
    const accountIdByName = {};
    for (const account of data.accounts) {
      console.log(`Importing account ${account.name}...`);
      const id = await db.addAccount({
        name: account.name,
        iban: account.iban,
        number: account.number === '0' ? undefined : account.number,
        idCurrency: account.currency_id ? account.currency_id : account.idCurrency,
        idAccountType: account.account_type_id === undefined ? 'checking' : account.account_type_id,
        startBalance: account.startBalance,
        closedAt: account.closedAt,
      });
      accountIdByName[account.name] = id;
    }
    console.log(`Imported ${Object.keys(data.accounts).length} accounts`);

    console.log(`Importing ${Object.keys(data.transactions).length} transactions...`);
    const balanceByDate = {};
    const maxTr = 100000;
    let cnt = 0;

    // first round: fix duplicate balances
    for (const tr of data.transactions) {
      if (cnt > maxTr) break;
      const idAccount = accountIdByName[tr.account_name];
      const balance = {};
      if (tr.bal_saldo !== null) {
        balance.idAccount = idAccount;
        balance.balance = tr.bal_saldo;
        balance.balanceDate = tr.t_valueDate;
        balanceByDate[`${idAccount}:${tr.t_valueDate}`] = {balance, idTr: tr.t_id};
      }
    }

    for (const tr of data.transactions) {
      if (cnt > maxTr) break;
      const idAccount = accountIdByName[tr.account_name];
      const isCash = tr.account_name.indexOf('Bargeld') >= 0;
      const idCategory = tr.category === null ? undefined : await db.getOrCreateCategory(tr.category);
      let cachedBalance = balanceByDate[`${idAccount}:${tr.t_valueDate}`];
      if (cachedBalance && cachedBalance.idTr === tr.t_id) {
        cachedBalance = cachedBalance.balance;
        // console.log(`Have balance of ${balance.balance} from transaction ${tr.t_id}`);
      } else {
        cachedBalance = undefined;
      }
      const tagIds = tr.tags ? await db.getOrCreateTags(tr.tags) : undefined;
      const id = await db.addTransaction({
          idAccount: idAccount,
          valueDate: tr.t_valueDate,
          amount: tr.t_amount,
          text: isCash ? null : tr.t_text,
          payee: tr.payee,
          entryText: tr.t_type,
          primaNotaNo: tr.t_prima_nota_no,
          gvCode: tr.t_zka_tr_code,
          processed: true,
          idCategory: idCategory,
          oldCategory: tr.orig_category,
          notes: isCash ? tr.t_text : null,
        },
        {
          tags: tagIds,
          balance: cachedBalance,
          ignoreRules: true,
        }
      );
      cnt++;
    }
    console.log(`Imported ${Object.keys(data.transactions).length} transactions`);
  }
}
