const schema = [
  {
    "tableName": "Gattungen",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "Name",
        "type": "string",
        "unique": true,
        "nullable": false,
      },
    ],
  },
  {
    "tableName": "Tiere",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "Name",
        "type": "string",
        "unique": true,
        "nullable": false,
      },
      {
        "name": "idGattung",
        "type": "integer",
      }
    ],
    "foreign_keys": [
      {
        "name": "FK_idGattung__Gattungen_id",
        "columns": ["idGattung"],
        "foreign_table": "Gattungen",
        "foreign_columns": ["id"],
      }
    ],
  },
];

export default schema;
