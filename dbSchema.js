const schema = {
  version: 28,
  name: 'finanzkraft',
  tables: [
    {
      tableName: 'SystemPreferences',
      columns: [
        {
          name: 'key',
          type: 'string',
          primary_key: true,
        },
        {
          name: 'description',
          type: 'string',
          unique: false,
          nullable: true,
        },
        {
          name: 'value',
          type: 'text',
          unique: false,
          nullable: true,
        },
      ],
    },
    {
      tableName: 'Roles',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'Name',
          type: 'string',
          unique: true,
          nullable: false,
        },
      ],
    },
    {
      tableName: 'RolePermissionProfiles',
      columns: [
        {
          name: 'idRole',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'idPermissionProfile',
          type: 'string',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idRole_PermissionProfile',
          columns: ['idRole', 'idPermissionProfile'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_idRole__Roles_id',
          columns: ['idRole'],
          foreign_table: 'Roles',
          foreign_columns: ['id'],
        },
        // {
        //   name: 'FK_idPermissionProfile__PermissionProfiles_idPermissionProfile',
        //   columns: ['idPermissionProfile'],
        //   foreign_table: 'PermissionProfiles',
        //   foreign_columns: ['idPermissionProfile'],
        // },
      ],
    },
    {
      tableName: 'PermissionProfiles',
      columns: [
        {
          name: 'idPermissionProfile',
          type: 'string',
          primary_key: true,
        },
        {
          name: 'Description',
          type: 'string',
          nullable: false,
        },
      ],
    },
    {
      tableName: 'Permission',
      columns: [
        {
          name: 'idPermissionProfile',
          type: 'string',
          nullable: false,
        },
        {
          name: 'Resource',
          type: 'string',
          nullable: false,
        },
        {
          name: 'Method',
          type: 'string',
          length: 6,
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idPermissionProfile_Resource_Method',
          columns: ['idPermissionProfile', 'Resource', 'Method'],
          unique: true,
        },
        {
          name: 'IDX_Resource_Method',
          columns: ['Resource', 'Method'],
          unique: false,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_Permission__PermissionProfile',
          columns: ['idPermissionProfile'],
          foreign_table: 'PermissionProfiles',
          foreign_columns: ['idPermissionProfile'],
        },
      ],
    },
    {
      tableName: 'MenuPermission',
      columns: [
        {
          name: 'idPermissionProfile',
          type: 'string',
          nullable: false,
        },
        {
          name: 'Menu',
          type: 'string',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idPermissionProfile_Menu',
          columns: ['idPermissionProfile', 'Menu'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_MenuPermission__PermissionProfile',
          columns: ['idPermissionProfile'],
          foreign_table: 'PermissionProfiles',
          foreign_columns: ['idPermissionProfile'],
        },
      ],
    },
    {
      tableName: 'Users',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'Email',
          type: 'string',
          length: 256,
          unique: true,
          nullable: false,
        },
        {
          name: 'EmailConfirmed',
          type: 'boolean',
          nullable: false,
          default: false,
        },
        {
          name: 'PasswordSalt',
          type: 'string',
          nullable: false,
        },
        {
          name: 'PasswordHash',
          type: 'string',
          nullable: false,
        },
        {
          name: 'ExpiredAfter',
          type: 'dateTime',
          nullable: true,
        },
        {
          name: 'LoginProvider',
          type: 'string',
          length: 128,
          nullable: false,
        },
        {
          name: 'LoginProviderKey',
          type: 'string',
          length: 128,
          nullable: false,
        },
        {
          name: 'Initials',
          type: 'string',
          length: 2,
        },
        {
          name: "Type",
          type: "string",
          length: 15,
          nullable: false,
        },
      ],
    },
    {
      tableName: 'UserAccessTokens',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idUser',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'AccessToken',
          type: 'string',
          nullable: false,
          unique: true,
        },
        {
          name: 'RefreshToken',
          type: 'string',
          nullable: false,
          unique: true,
        },
        {
          name: 'AccessTokenExpiredAfter',
          type: 'dateTime',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_UserAccessTokens_ExpiredAfter',
          columns: ['AccessTokenExpiredAfter'],
          unique: false,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_idUser__Users_id',
          columns: ['idUser'],
          foreign_table: 'Users',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      tableName: 'UserRoles',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idUser',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'idRole',
          type: 'integer',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'UDX_UserIdRoleId',
          columns: ['idUser', 'idRole'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_UserRoles_idUser__Users_id',
          columns: ['idUser'],
          foreign_table: 'Users',
          foreign_columns: ['id'],
        },
        {
          name: 'FK_UserRoles_idRole__Roles_id',
          columns: ['idRole'],
          foreign_table: 'Roles',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      tableName: 'Preferences',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idUser',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'key',
          type: 'string',
          unique: false,
          nullable: false,
        },
        {
          name: 'description',
          type: 'string',
          unique: false,
          nullable: true,
        },
        {
          name: 'value',
          type: 'text',
          unique: false,
          nullable: true,
        },
      ],
      indexes: [
        {
          name: 'IDX_Preferences_UserKey',
          columns: ['idUser', 'key'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_Preferences_idUser__Users_id',
          columns: ['idUser'],
          foreign_table: 'Users',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      "tableName": "Fk_Currency",
      "columns": [
        {
          "name": "id",
          "type": "string",
          length: 3,
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
        },
        {
          "name": "short",
          "type": "string",
          length: 1,
        },
      ],
      "values": [
        {id: "EUR", name: "Euro", short: "€"},
        {id: "USD", name: "Dollar", short: "$"},
      ]
    },
    {
      "tableName": "Fk_Timespan",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
        },
        {
          "name": "fromRuleNo",
          "type": "integer",
        },
        {
          "name": "fromRuleAttribute",
          "type": "string",
        },
        {
          "name": "toRuleNo",
          "type": "integer",
        },
        {
          "name": "toRuleAttribute",
          "type": "string",
        },
        {
          "name": "order",
          "type": "integer",
          "unique": true,
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_Timespan_order',
          columns: ['order'],
          unique: true,
        },
      ],
      "values": [
        {name: "ohne Einschränkung", fromRuleNo: 0, order: 0},
        {name: "vergangene 1 Monate", fromRuleNo: 1, fromRuleAttribute: "1", order: 1},
        {name: "vergangene 3 Monate", fromRuleNo: 1, fromRuleAttribute: "3", order: 2},
        {name: "vergangene 6 Monate", fromRuleNo: 1, fromRuleAttribute: "6", order: 3},
        {name: "vergangene 12 Monate", fromRuleNo: 1, fromRuleAttribute: "12", order: 4},
        {name: "vergangene 24 Monate", fromRuleNo: 1, fromRuleAttribute: "24", order: 5},
        {name: "dieses Jahr", fromRuleNo: 2, order: 6},
        {name: "letztes Jahr", fromRuleNo: 3, order: 7},
        {name: "2022", fromRuleNo: 4, fromRuleAttribute: "2022", order: 8},
        {name: "2021", fromRuleNo: 4, fromRuleAttribute: "2021", order: 9},
        {name: "2020", fromRuleNo: 4, fromRuleAttribute: "2020", order: 10},
      ]
    },
    {
      "tableName": "Fk_AccountType",
      "columns": [
        {
          "name": "id",
          "type": "string",
          "length": 10,
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
          "unique": true,
          "nullable": false,
        },
        {
          "name": "order",
          "type": "integer",
          "unique": true,
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_AccountType_order',
          columns: ['order'],
          unique: true,
        },
      ],
      "values": [
        {id: "cash", name: "Bargeld", order: 0},
        {id: "checking", name: "Girokonto", order: 1},
        {id: "credit", name: "Kreditkarte", order: 2},
        {id: "daily", name: "Tagesgeld", order: 3},
        {id: "savings", name: "Sparkonto", order: 4},
        {id: "security", name: "Wertpapier", order: 5},
        {id: "other", name: "Sonstiges", order: 6},
      ]
    },
    {
      "tableName": "Fk_Bankcontact",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
          "unique": true,
          "nullable": false,
        },
        {
          "name": "fintsUrl",
          "type": "string",
          "length": 256,
          "nullable": true,
        },
        {
          "name": "fintsBankId",
          "type": "string",
          "length": 100,
          "nullable": true,
        },
        {
          "name": "fintsUserIdEncrypted",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "fintsPasswordEncrypted",
          "type": "string",
          "nullable": true,
        },
      ],
    },
    {
      "tableName": "Fk_Account",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
          "unique": true,
          "nullable": false,
        },
        {
          "name": "iban",
          "type": "string",
          "unique": true,
          "nullable": true,
        },
        {
          "name": "number",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "idCurrency",
          "type": "string",
          length: 3,
          "nullable": false,
        },
        {
          "name": "idAccountType",
          "type": "string",
          length: 10,
          "nullable": false,
        },
        {
          "name": "startBalance",
          "type": "decimal",
          precision: 12,
          scale: 2,
          "nullable": false,
        },
        {
          "name": "closedAt",
          "type": "dateTime",
          "nullable": true,
        },
        {
          "name": "idBankcontact",
          "type": "integer",
          "nullable": true,
        },
        {
          "name": "fintsAccountNumber",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "fintsError",
          "type": "string",
          "nullable": false,
          "default": "",
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_idCurrency__Fk_Currency_id",
          "columns": ["idCurrency"],
          "foreign_table": "Fk_Currency",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_idAccountType__Fk_AccountType_id",
          "columns": ["idAccountType"],
          "foreign_table": "Fk_AccountType",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_idBankcontact__Fk_Bankcontact_id",
          "columns": ["idBankcontact"],
          "foreign_table": "Fk_Bankcontact",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_AccountReader",
      "columns": [
        {
          "name": "idAccount",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "idUser",
          "type": "integer",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_AccountReader_account',
          columns: ['idAccount'],
        },
        {
          name: 'IDX_AccountReader_user_account',
          columns: ['idAccount', 'idUser'],
          unique: true,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_R_idAccount__Fk_Account_id",
          "columns": ["idAccount"],
          "foreign_table": "Fk_Account",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_R_idUser__Users_id",
          "columns": ["idUser"],
          "foreign_table": "Users",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_AccountWriter",
      "columns": [
        {
          "name": "idAccount",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "idUser",
          "type": "integer",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_AccountWriter_account',
          columns: ['idAccount'],
        },
        {
          name: 'IDX_AccountWriter_user_account',
          columns: ['idAccount', 'idUser'],
          unique: true,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_W_idAccount__Fk_Account_id",
          "columns": ["idAccount"],
          "foreign_table": "Fk_Account",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_W_idUser__Users_id",
          "columns": ["idUser"],
          "foreign_table": "Users",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_Category",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
          "nullable": false,
        },
        {
          "name": "fullName",
          "type": "string",
          "nullable": false,
        },
        {
          "name": "idCategoryParent",
          "type": "integer",
          "nullable": true,
        },
      ],
      indexes: [
        {
          name: 'IDX_name_idCategoryParent',
          columns: ['name', 'idCategoryParent'],
          unique: true,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_idCategoryParent__Fk_Category_id",
          "columns": ["idCategoryParent"],
          "foreign_table": "Fk_Category",
          "foreign_columns": ["id"],
        }
      ],
    },
    {
      "tableName": "Fk_RuleSet",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "name",
          "type": "string",
          "nullable": false,
        },
        {
          "name": "set_note",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "idSetCategory",
          "type": "integer",
          "nullable": true,
        },
        {
          "name": "is_amount_min",
          "type": "decimal",
          precision: 12,
          scale: 2,
          "nullable": true,
        },
        {
          "name": "is_amount_max",
          "type": "decimal",
          precision: 12,
          scale: 2,
          "nullable": true,
        },
        {
          "name": "is_MREF",
          "type": "string",
          "length": 35,
          "nullable": true,
        },
      ],
      indexes: [
        {
          name: 'IDX_Fk_RuleSet_name',
          columns: ['name'],
          unique: true,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_Fk_RuleSet__Fk_Category_id",
          "columns": ["idSetCategory"],
          "foreign_table": "Fk_Category",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_RuleAccount",
      "columns": [
        {
          "name": "idRuleSet",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "idAccount",
          "type": "integer",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_Fk_RuleAccount_idRuleSet_idAccount',
          columns: ['idRuleSet', 'idAccount'],
          unique: true,
        },
        {
          name: 'IDX_Fk_RuleAccount_idAccount',
          columns: ['idAccount'],
          unique: false,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_Fk_RuleAccount__Fk_RuleSet_id",
          "columns": ["idRuleSet"],
          "foreign_table": "Fk_RuleSet",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_RuleText",
      "columns": [
        {
          "name": "idRuleSet",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "text",
          "type": "string",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_Fk_RuleText_idRuleSet_text',
          columns: ['idRuleSet', 'text'],
          unique: true,
        },
        {
          name: 'IDX_Fk_RuleText_idRuleSet',
          columns: ['idRuleSet'],
          unique: false,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_Fk_RuleText__Fk_RuleSet_id",
          "columns": ["idRuleSet"],
          "foreign_table": "Fk_RuleSet",
          "foreign_columns": ["id"],
        },
      ],
    },
    // {
    //   "tableName": "Fk_Rule",
    //   "columns": [
    //     {
    //       "name": "id",
    //       "type": "autoincrement",
    //       "primary_key": true,
    //     },
    //     {
    //       "name": "idRuleSet",
    //       "type": "integer",
    //       "nullable": false,
    //     },
    //     {
    //       "name": "idAccount",
    //       "type": "integer",
    //       "nullable": true,
    //     },
    //     {
    //       "name": "entryText",
    //       "type": "string",
    //       "nullable": true,
    //     },
    //     {
    //       "name": "text",
    //       "type": "string",
    //       "nullable": true,
    //     },
    //     {
    //       "name": "payee",
    //       "type": "string",
    //       "nullable": true,
    //     },
    //     {
    //       "name": "payeePayerAcctNo",
    //       "type": "string",
    //       "nullable": true,
    //     },
    //     {
    //       "name": "gvCode",
    //       "type": "string",
    //       "length": 4,
    //       "nullable": true,
    //     },
    //   ],
    //   indexes: [
    //     {
    //       name: 'IDX_Fk_Rule_idAccount',
    //       columns: ['idAccount'],
    //       unique: false,
    //     },
    //   ],
    //   "foreign_keys": [
    //     {
    //       "name": "FK_Fk_Rule__Fk_Account_id",
    //       "columns": ["idAccount"],
    //       "foreign_table": "Fk_Account",
    //       "foreign_columns": ["id"],
    //     },
    //     {
    //       "name": "FK_Fk_Rule__Fk_RuleSet_id",
    //       "columns": ["idRuleSet"],
    //       "foreign_table": "Fk_RuleSet",
    //       "foreign_columns": ["id"],
    //     },
    //   ],
    // },
    {
      "tableName": "Fk_Transaction",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "idAccount",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "bookingDate",
          "type": "dateTime",
          "nullable": true,
        },
        {
          "name": "valueDate",
          "type": "dateTime",
          "nullable": false,
        },
        {
          "name": "amount",
          "type": "decimal",
          precision: 12,
          scale: 2,
          "nullable": false,
        },
        {
          "name": "text",
          "type": "text",
          "nullable": true,
        },
        {
          "name": "EREF",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "CRED",
          "type": "string",
          "length": 35,
          "nullable": true,
        },
        {
          "name": "MREF",
          "type": "string",
          "length": 35,
          "nullable": true,
        },
        {
          "name": "ABWA",
          "type": "string",
          "length": 40,
          "nullable": true,
        },
        {
          "name": "ABWE",
          "type": "string",
          "length": 40,
          "nullable": true,
        },
        {
          "name": "IBAN",
          "type": "string",
          "length": 35,
          "nullable": true,
        },
        {
          "name": "BIC",
          "type": "string",
          "length": 11,
          "nullable": true,
        },
        {
          "name": "REF",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "notes",
          "type": "text",
          "nullable": true,
        },
        {
          "name": "payee",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "payeePayerAcctNo",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "idCategory",
          "type": "integer",
          "nullable": true,
        },
        {
          "name": "oldCategory",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "entryText",
          "type": "string",
          "nullable": true,
        },
        {
          "name": "gvCode",
          "type": "string",
          "length": 4,
          "nullable": true,
        },
        {
          "name": "primaNotaNo",
          "type": "integer",
          "nullable": true,
        },
        {
          "name": "idRuleSet",
          "type": "integer",
          "nullable": true,
        },
        {
          "name": "processed",
          "type": "boolean",
          "nullable": false,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_idAccount__Fk_Account_id",
          "columns": ["idAccount"],
          "foreign_table": "Fk_Account",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_idCategory__Fk_Category_id",
          "columns": ["idCategory"],
          "foreign_table": "Fk_Category",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_idRuleSet__Fk_RuleSet_id",
          "columns": ["idRuleSet"],
          "foreign_table": "Fk_RuleSet",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_TransactionStatus",
      "columns": [
        {
          "name": "idTransaction",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "idUser",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "unseen",
          "type": "boolean",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idTransaction_idUser_confirmed',
          columns: ['idTransaction', 'idUser', 'unseen'],
          unique: true,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_idTransaction__Fk_Transaction_id",
          "columns": ["idTransaction"],
          "foreign_table": "Fk_Transaction",
          "foreign_columns": ["id"],
        },
        {
          "name": "FK_Fk_TransactionStatus_idUser__Users_id",
          "columns": ["idUser"],
          "foreign_table": "Users",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_Tag",
      "columns": [
        {
          "name": "id",
          "type": "autoincrement",
          "primary_key": true,
        },
        {
          "name": "tag",
          "type": "string",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_Tag',
          columns: ['tag'],
          unique: true,
        },
      ],
    },
    {
      "tableName": "Fk_TagTransaction",
      "columns": [
        {
          "name": "idTransaction",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "idTag",
          "type": "integer",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_TagTransaction_idTransaction',
          columns: ['idTransaction'],
        },
        {
          name: 'IDX_TagTransaction_idTag',
          columns: ['idTag'],
        },
      ],
      "foreign_keys": [
        {
          "name": "Fk_TagTransaction__Fk_Transaction_id",
          "columns": ["idTransaction"],
          "foreign_table": "Fk_Transaction",
          "foreign_columns": ["id"],
        },
        {
          "name": "Fk_TagTransaction_idTag__Fk_Tag_id",
          "columns": ["idTag"],
          "foreign_table": "Fk_Tag",
          "foreign_columns": ["id"],
        },
      ],
    },
    {
      "tableName": "Fk_AccountBalance",
      "columns": [
        {
          "name": "idAccount",
          "type": "integer",
          "nullable": false,
        },
        {
          "name": "balanceDate",
          "type": "dateTime",
          "nullable": false,
        },
        {
          "name": "balance",
          "type": "decimal",
          precision: 12,
          scale: 2,
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idAccount_balanceDate',
          columns: ['idAccount', 'balanceDate'],
          unique: true,
        },
      ],
      "foreign_keys": [
        {
          "name": "FK_Fk_AccountBalance_idAccount__Fk_Account_id",
          "columns": ["idAccount"],
          "foreign_table": "Fk_Account",
          "foreign_columns": ["id"],
        },
      ],
    },
  ],
}

export default schema;
