const permissions = {
  timesapans_list_read: {
    description: "Zeitspannen (Datumsfilter) anzeigen",
    resources: ["/api/timespans"],
    methods: ["get"],
    menus: ["admin.timespans"]
  },
  timesapans_create: {
    description: "Zeitspanne (Datumsfilter) neu anlegen",
    resources: ["/api/timespans"],
    methods: ["put"],
    menus: ["admin.timespans", "admin.timespan"]
  },
  timesapans_read: {
    description: "Zeitspanne (Datumsfilter) anzeigen",
    resources: ["/api/timespans/:id"],
    methods: ["get"],
    menus: ["admin.timespan"]
  },
  timesapans_update: {
    description: "Zeitspanne (Datumsfilter) ändern",
    resources: ["/api/timespans/:id"],
    methods: ["get", "post"],
    menus: ["admin.timespans"]
  },
  timesapans_delete: {
    description: "Zeitspanne (Datumsfilter) löschen",
    resources: ["/api/timespans/:id"],
    methods: ["delete"],
    menus: ["admin.timespan"]
  },
  accounts_list_read: {
    description: "Konten anzeigen",
    resources: ["/api/accounts"],
    methods: ["get"],
    menus: ["admin.accounts"]
  },
  account_create: {
    description: "Konto neu anlegen",
    resources: ["/api/accounts"],
    methods: ["put"],
    menus: ["admin.accounts", "admin.account"]
  },
  account_read: {
    description: "Konto anzeigen",
    resources: ["/api/accounts/:id"],
    methods: ["get"],
    menus: ["admin.account"]
  },
  account_update: {
    description: "Konto ändern",
    resources: ["/api/accounts/:id"],
    methods: ["get", "post"],
    menus: ["admin.account"]
  },
  account_delete: {
    description: "Konto löschen",
    resources: ["/api/accounts/:id"],
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
    resources: ["/api/transaction/:id"],
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
