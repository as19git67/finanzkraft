const permissions = {
  gattungen_list_read: {
    description: "Gattungen anzeigen",
    resources: ["/api/tiere/gattung"],
    permissions: ["get"],
    menus: ["admin.gattungen"]
  },
  gattungen_create: {
    description: "Neuen Gattung anlegen",
    resources: ["/api/tiere/gattung"],
    permissions: ["put"],
    menus: ["admin.gattung"]
  },
  gattungen_read: {
    description: "Gattung anzeigen",
    resources: ["/api/tiere/gattung/:id"],
    permissions: ["get"],
    menus: ["admin.gattung"]
  },
  gattungen_update: {
    description: "Gattung ändern",
    resources: ["/api/tiere/gattung/:id"],
    permissions: ["get", "post"],
    menus: ["admin.gattung"]
  },
  gattungen_delete: {
    description: "Gattung löschen",
    resources: ["/api/tiere/gattung/:id"],
    permissions: ["delete"],
    menus: ["admin.gattung"]
  },
  tiere_list_read: {
    description: "Liste Tiere anzeigen",
    resources: ["/api/tiere/tier"],
    permissions: ["get"],
    menus: ["admin.tiere"]
  },
  tiere_create: {
    description: "Neues Tier anlegen",
    resources: ["/api/tiere/tier"],
    permissions: ["put"],
    menus: ["admin.tier", "admin.tiere"]
  },
  tiere_read: {
    description: "Tier anzeigen",
    resources: ["/api/tiere/tier/:id"],
    permissions: ["get"],
    menus: ["admin.tier"]
  },
  tiere_update: {
    description: "Tier ändern",
    resources: ["/api/tiere/tier/:id"],
    permissions: ["get", "post"],
    menus: ["admin.tier", "admin.tiere"]
  },
  tiere_delete: {
    description: "Tier löschen",
    resources: ["/api/tiere/tier/:id"],
    permissions: ["delete"],
    menus: ["admin.role", "admin.roles"]
  },
}

export default permissions;