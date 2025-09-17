import yaml from 'js-yaml';
import fs from 'fs';
import {writeFile} from "node:fs/promises";

export default async function exportData(db, exportFilename) {
  const schemaVersion = 1;

  let data = {};
  try {
    data = yaml.load(fs.readFileSync(exportFilename, 'utf8'));
  } catch (ex) {
    switch (ex.code) {
      case 'ENOENT':
        console.log(`Export file ${exportFilename} does not exist. Starting with empty file.`);
        data = {};
        break;
      default:
        console.log(`Exception while opening export file ${exportFilename}: ${ex.message}`);
        throw ex;
    }
  }

  const schemaVersionInData = data.Schema || 0;
  if (schemaVersionInData !== schemaVersion) {
    console.log(`Export file ${exportFilename} has schema version ${schemaVersionInData}. Starting with empty file.`);
    data = {};
  }
  data.Schema = schemaVersion;

  console.log('Exporting roles...');
  data.Roles = await db.getRoles();
  const rolesById = {};
  data.Roles.forEach(role => {
    rolesById[role.id] = role;
  });
  console.log(`Exported ${data.Roles.length} roles`);

  console.log('Exporting role permission profiles...');
  data.RolePermissionProfiles = await Promise.all(data.Roles.map(async role => {
    const permissionProfiles = await db.getPermissionProfilesForRole(role.id);
    return {
      role: role.Name,
      permissionProfiles: permissionProfiles.map(permissionProfile => {
        return permissionProfile.idPermissionProfile;
      }),
    };
  }));
  console.log(`Exported ${data.RolePermissionProfiles.length} role permission profiles`);

  console.log('Exporting users...');
  const users = await db.getUserForBackup();
  const usersById = {};
  data.Users = users.map(user => {
    usersById[user.id] = user.Email;
    const u = {...user};
    delete u.id;
    return u;
  });
  console.log(`Exported ${data.Users.length} users`);

  console.log('Exporting user roles...');
  data.UserRoles = await Promise.all(users.map(async user => {
    const rolesOfUser = await db.getRolesOfUser(user.id);
    return {
      userEmail: user.Email,
      roles: rolesOfUser.map(role => {
        return rolesById[role.idRole];
      }),
    };
  }));
  console.log(`Exported ${data.UserRoles.length} user roles`);

  console.log('Exporting categories...');
  const categories = await db.getCategories();
  const categoriesById = {};
  categories.forEach(category => {
    categoriesById[category.id] = {
      parent_name: category.parent_name,
      name: category.name,
      full_name: category.full_name,
    };
  });
  data.Categories = categories.map(category => {
    delete category.id;
    return category;
  });
  console.log(`Exported ${data.Categories.length} categories`);

  console.log('Exporting transaction presets...');
  try {
    data.NewTransactionPresets = await Promise.all(users.map(async user => {
      const newTransactionPresets = await db.getNewTransactionPresets(user.id);
      const presetObj = JSON.parse(newTransactionPresets);
      const filteredPresetObj = presetObj.filter(preset => {
        // filter out empty objects
        return Object.keys(preset).length > 0;
      });
      return {
        userEmail: user.Email,
        newTransactionPresets: presetObj.map(preset => {
          if (preset.categoryId) {
            preset.category = categoriesById[preset.categoryId].full_name;
            delete preset.categoryId;
          }
          return preset;
        }),
      };
    }));
  } catch (ex) {
    console.log(`Exception while exporting transaction presets: ${ex.message}`);
    throw ex;
  }
  console.log(`Exported ${data.NewTransactionPresets.length} transaction presets`);

  console.log('Exporting rule sets...');
  data.RuleSets = await db.getRuleSets();
  console.log(`Exported ${data.RuleSets.length} rule sets`);

  console.log('Exporting bankcontacts...');
  data.Bankcontacts = await db.getBankcontacts();
  console.log(`Exported ${data.Bankcontacts.length} bankcontacts`);

  console.log('Exporting accounts...');
  const accounts = await db.getAccounts();
  data.Accounts = accounts.map(account => {
    if (account.writer) {
      account.writer = account.writer.split(',').map(writer => {
        return usersById[writer];
      });
    } else {
      account.writer = [];
    }
    if (account.reader) {
      account.reader = account.reader.split(',').map(reader => {
        return usersById[reader];
      });
    } else {
      account.reader = [];
    }
    return account;
  });
  console.log(`Exported ${data.Accounts.length} accounts`);

  data.Transactions = await db.getTransactionsForExport();  // todo: incl. status?, tags
  console.log(`Exported ${data.Transactions.length} transactions`);

  const json = JSON.stringify(data, undefined, 2);
  const dataBuffer = new Uint8Array(Buffer.from(json));
  await writeFile(exportFilename, dataBuffer, 'utf8');
  console.log(`DB export written to ${exportFilename}`);
}
