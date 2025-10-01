const permissions = {
  rule_list_read: {
    description: "Regeln anzeigen",
    resources: ["/api/rules"],
    methods: ["get"],
    menus: ["admin.rules"]
  },
  rule_create: {
    description: "Regel neu anlegen",
    resources: ["/api/rules"],
    methods: ["put"],
    menus: ["admin.rules", "admin.rule"]
  },
  rule_read: {
    description: "Regel anzeigen",
    resources: ["/api/rules/:id"],
    methods: ["get"],
    menus: ["admin.rule"]
  },
  rule_update: {
    description: "Regel ändern",
    resources: ["/api/rules/:id"],
    methods: ["get", "post"],
    menus: ["admin.rule"]
  },
  rule_delete: {
    description: "Regel löschen",
    resources: ["/api/rules/:id"],
    methods: ["delete"],
    menus: ["admin.rule"]
  },
  category_list_read: {
    description: "Kategorien anzeigen",
    resources: ["/api/category"],
    methods: ["get"],
    menus: ["admin.categories"]
  },
  category_create: {
    description: "Kategorie neu anlegen",
    resources: ["/api/category"],
    methods: ["put"],
    menus: ["admin.categories", "admin.category"]
  },
  category_read: {
    description: "Kategorie anzeigen",
    resources: ["/api/category/:id"],
    methods: ["get"],
    menus: ["admin.category"]
  },
  category_update: {
    description: "Kategorie ändern",
    resources: ["/api/category/:id"],
    methods: ["get", "post"],
    menus: ["admin.category"]
  },
  category_delete: {
    description: "Kategorie löschen",
    resources: ["/api/category/:id"],
    methods: ["delete"],
    menus: ["admin.category"]
  },
  timespans_list_read: {
    description: "Zeitspannen (Datumsfilter) anzeigen",
    resources: ["/api/timespans"],
    methods: ["get"],
    menus: ["admin.timespans"]
  },
  timespan_create: {
    description: "Zeitspanne (Datumsfilter) neu anlegen",
    resources: ["/api/timespans"],
    methods: ["put"],
    menus: ["admin.timespans", "admin.timespan"]
  },
  timespan_read: {
    description: "Zeitspanne (Datumsfilter) anzeigen",
    resources: ["/api/timespans/:id"],
    methods: ["get"],
    menus: ["admin.timespan"]
  },
  timespan_update: {
    description: "Zeitspanne (Datumsfilter) ändern",
    resources: ["/api/timespans/:id"],
    methods: ["get", "post"],
    menus: ["admin.timespans"]
  },
  timespan_delete: {
    description: "Zeitspanne (Datumsfilter) löschen",
    resources: ["/api/timespans/:id"],
    methods: ["delete"],
    menus: ["admin.timespan"]
  },
  newtransactionpresets_create: {
    description: "Preset für neue Buchung anlegen",
    resources: ["/api/newtransactionpresets"],
    methods: ["put"],
    menus: ["admin.newtransactionpresets"]
  },
  newtransactionpresets_read: {
    description: "Preset für neue Buchung anzeigen",
    resources: ["/api/newtransactionpresets"],
    methods: ["get"],
    menus: ["admin.newtransactionpresets"]
  },
  newtransactionpresets_update: {
    description: "Preset für neue Buchung ändern",
    resources: ["/api/newtransactionpresets"],
    methods: ["get", "post"],
    menus: ["admin.newtransactionpresets"]
  },
  newtransactionpresets_delete: {
    description: "Preset für neue Buchung löschen",
    resources: ["/api/newtransactionpresets"],
    methods: ["delete"],
    menus: ["admin.newtransactionpresets"]
  },
  tags_list_read: {
    description: "Tags anzeigen",
    resources: ["/api/tags"],
    methods: ["get"],
    menus: ["admin.tags"]
  },
  tag_create: {
    description: "Tag neu anlegen",
    resources: ["/api/tags"],
    methods: ["put"],
    menus: ["admin.tags", "admin.tag"]
  },
  tag_read: {
    description: "Tag anzeigen",
    resources: ["/api/tags/:id"],
    methods: ["get"],
    menus: ["admin.tag"]
  },
  tag_update: {
    description: "Tag ändern",
    resources: ["/api/tags/:id"],
    methods: ["get", "post"],
    menus: ["admin.tag"]
  },
  tag_delete: {
    description: "Tag löschen",
    resources: ["/api/tags/:id"],
    methods: ["delete"],
    menus: ["admin.tag"]
  },
  currencies_list_read: {
    description: "Währungen anzeigen",
    resources: ["/api/currencies"],
    methods: ["get"],
    menus: ["admin.currencies"]
  },
  currencies_create: {
    description: "Währung neu anlegen",
    resources: ["/api/currencies"],
    methods: ["put"],
    menus: ["admin.currencies", "admin.currency"]
  },
  currency_read: {
    description: "Währung anzeigen",
    resources: ["/api/currencies/:id"],
    methods: ["get"],
    menus: ["admin.currency"]
  },
  currency_update: {
    description: "Währung ändern",
    resources: ["/api/currencies/:id"],
    methods: ["get", "post"],
    menus: ["admin.currency"]
  },
  currency_delete: {
    description: "Währung löschen",
    resources: ["/api/currencies/:id"],
    methods: ["delete"],
    menus: ["admin.currency"]
  },
  onlinebanking_list_read: {
    description: "Onlinebanking Liste anzeigen",
    resources: ["/api/bankcontacts"],
    methods: ["get"],
    menus: ["admin.fints.bankcontacts", "admin.onlinebanking"]
  },
  onlinebanking_create: {
    description: "Onlinebanking neu",
    resources: ["/api/bankcontacts"],
    methods: ["put"],
    menus: ["admin.fints.bankcontacts", "admin.bankcontact", "admin.onlinebanking.new"]
  },
  onlinebanking_read: {
    description: "Onlinebanking anzeigen",
    resources: ["/api/bankcontacts/:id"],
    methods: ["get"],
    menus: ["admin.fints.bankcontact", "admin.onlinebanking"]
  },
  onlinebanking_update: {
    description: "Onlinebanking ändern",
    resources: ["/api/bankcontacts/:id"],
    methods: ["get", "post"],
    menus: ["admin.fints.bankcontact", "admin.onlinebanking.edit"]
  },
  onlinebanking_delete: {
    description: "Onlinebanking Eintrag löschen",
    resources: ["/api/bankcontacts/:id"],
    methods: ["delete"],
    menus: ["admin.fints.bankcontact", "admin.onlinebanking.delete"]
  },
  onlinebanking_statements_download: {
    description: "Onlinebanking Konten abrufen",
    resources: ["/api/accounts/:id/statements"],
    methods: ["get"],
    menus: ["admin.statements_download"]
  },
  onlinebanking_accounts_of_bankcontact_read: {
    description: "Onlinebanking Konten eines Bankkontakts abrufen",
    resources: ["/api/bankcontacts/:id/accounts"],
    methods: ["get"],
    menus: ["admin.fints.accounts"]
  },
  accounts_list_read: {
    description: "Konten anzeigen",
    resources: ["/api/accounts", "/api/accounttypes"],
    methods: ["get"],
    menus: ["admin.accounts", "user.accounts"]
  },
  account_create: {
    description: "Konto neu anlegen",
    resources: ["/api/accounts", "/api/accounttypes"],
    methods: ["put"],
    menus: ["admin.accounts", "admin.account"]
  },
  account_read: {
    description: "Konto anzeigen",
    resources: ["/api/accounts/:id",  "/api/accounttypes/:id"],
    methods: ["get"],
    menus: ["admin.account", "user.accounts"]
  },
  account_update: {
    description: "Konto ändern",
    resources: ["/api/accounts/:id", "/api/accounttypes/:id"],
    methods: ["get", "post"],
    menus: ["admin.account"]
  },
  account_delete: {
    description: "Konto löschen",
    resources: ["/api/accounts/:id", "/api/accounttypes/:id"],
    methods: ["delete"],
    menus: ["admin.account"]
  },
  transaction_list_read: {
    description: "Transaktionsliste anzeigen",
    resources: ["/api/accounts", "/api/transaction", "/api/accounts/:id/transactions"],
    methods: ["get"],
    menus: ["admin.transactions"]
  },
  transaction_upload: {
    description: "Transaktionen hochladen (fints)",
    resources: ["/api/accounts/:id/transactions"],
    methods: ["get", "post"],
    menus: ["admin.upload.transactions"]
  },
  transaction_create: {
    description: "Transaktion neu anlegen",
    resources: ["/api/transaction"],
    methods: ["put"],
    menus: ["admin.transactions", "admin.transaction"]
  },
  transaction_read: {
    description: "Transaktion anzeigen",
    resources: ["/api/transaction/:id"],
    methods: ["get"],
    menus: ["admin.transaction"]
  },
  transaction_update: {
    description: "Transaktion ändern",
    resources: ["/api/transaction/:id", "/api/transaction"],
    methods: ["get", "post"],
    menus: ["admin.transaction"]
  },
  transaction_delete: {
    description: "Transaktion löschen",
    resources: ["/api/transaction/:id"],
    methods: ["delete"],
    menus: ["admin.transaction"]
  },
}

export default permissions;
