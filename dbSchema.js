const schema = {
  version: 3,
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
          "name": "idCategory",
          "type": "integer",
          "nullable": true,
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
      ],
    },
  ],
}

export default schema;
