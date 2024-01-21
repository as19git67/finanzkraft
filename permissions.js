const permissions = {
  timesapans_list_read: {
    description: "Zeitspannen (Datumsfilter) anzeigen",
    resources: ["/api/timespans"],
    permissions: ["get"],
    menus: ["admin.timespans"]
  },
  timesapans_create: {
    description: "Neue Zeitspanne (Datumsfilter) anlegen",
    resources: ["/api/timespans"],
    permissions: ["put"],
    menus: ["admin.timespans", "admin.timespan"]
  },
  timesapans_read: {
    description: "Zeitspanne (Datumsfilter) anzeigen",
    resources: ["/api/timespans/:id"],
    permissions: ["get"],
    menus: ["admin.timespan"]
  },
  timesapans_update: {
    description: "Zeitspanne (Datumsfilter) ändern",
    resources: ["/api/timespans/:id"],
    permissions: ["get", "post"],
    menus: ["admin.timespans"]
  },
  timesapans_delete: {
    description: "Zeitspanne (Datumsfilter) löschen",
    resources: ["/api/timespans/:id"],
    permissions: ["delete"],
    menus: ["admin.timespan"]
  },
  accounts_list_read: {
    description: "Konten anzeigen",
    resources: ["/api/accounts"],
    permissions: ["get"],
    menus: ["admin.accounts"]
  },
  account_create: {
    description: "Neues Konto anlegen",
    resources: ["/api/accounts"],
    permissions: ["put"],
    menus: ["admin.accounts", "admin.account"]
  },
  account_read: {
    description: "Konto anzeigen",
    resources: ["/api/accounts/:id"],
    permissions: ["get"],
    menus: ["admin.account"]
  },
  account_update: {
    description: "Konto ändern",
    resources: ["/api/accounts/:id"],
    permissions: ["get", "post"],
    menus: ["admin.account"]
  },
  account_delete: {
    description: "Konto löschen",
    resources: ["/api/accounts/:id"],
    permissions: ["delete"],
    menus: ["admin.account"]
  },
  transaction_list_read: {
    description: "Transaktionsliste anzeigen",
    resources: ["/api/transactions"],
    permissions: ["get"],
    menus: ["admin.transactions"]
  },
  transaction_create: {
    description: "Neue Transaktion anlegen",
    resources: ["/api/transactions"],
    permissions: ["put"],
    menus: ["admin.transactions", "admin.transaction"]
  },
  transaction_read: {
    description: "Transaktion anzeigen",
    resources: ["/api/transactions/:id"],
    permissions: ["get"],
    menus: ["admin.transaction"]
  },
  transaction_update: {
    description: "Transaktion ändern",
    resources: ["/api/transaction/:id"],
    permissions: ["get", "post"],
    menus: ["admin.transaction"]
  },
  transaction_delete: {
    description: "Transaktion löschen",
    resources: ["/api/transaction/:id"],
    permissions: ["delete"],
    menus: ["admin.transaction"]
  },
}

export default permissions;