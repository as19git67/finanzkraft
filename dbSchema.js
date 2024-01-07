const schema = [
  {
    "tableName": "Fk_Currency",
    "columns": [
      {
        "name": "name",
        "type": "string",
        length: 3,
        "primary_key": true,
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
        "nullable": false,
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
        "nullable": false,
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
        "name": "amountCurrency",
        "type": "string",
        "nullable": false,
        length: 3,
      },
      {
        "name": "text",
        "type": "string",
        "nullable": true,
      },
      {
        "name": "notes",
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
      {
        "name": "FK_amountCurrency__Fk_Currency_name",
        "columns": ["amountCurrency"],
        "foreign_table": "Fk_Currency",
        "foreign_columns": ["name"],
      }
    ],
  },
];

export default schema;
