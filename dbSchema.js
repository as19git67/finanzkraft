const schema = {
  version: 17,
  name: 'finanzkraft',
  tables: [
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
      ],
      "foreign_keys": [
        {
          "name": "FK_idCurrency__Fk_Currency_id",
          "columns": ["idCurrency"],
          "foreign_table": "Fk_Currency",
          "foreign_columns": ["id"],
        }
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
          "name": "confirmed",
          "type": "boolean",
          "nullable": false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idTransaction_idUser_confirmed',
          columns: ['idTransaction', 'idUser', 'confirmed'],
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
