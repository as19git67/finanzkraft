const basePermissions = {
  usermanagement_user_list_read: {
    description: 'Usermangement: Benutzerliste anzeigen',
    resources: ['/api/user'],
    methods: ['get'],
    menus: ['admin.users'],
  },
  usermanagement_user_create: {
    description: 'Usermangement: neuen Benutzer anlegen',
    resources: ['/api/user'],
    methods: ['put'],
    menus: ['admin.user', 'admin.user.create', 'admin.users'],
  },
  usermanagement_user_read: {
    description: 'Usermangement: Benutzer anzeigen',
    resources: ['/api/user/:id'],
    methods: ['get'],
    menus: ['admin.user'],
  },
  usermanagement_user_update: {
    description: 'Usermangement: Benutzer ändern',
    resources: ['/api/user/:id'],
    methods: ['get', 'post'],
    menus: ['admin.user.edit'],
  },
  usermanagement_user_delete: {
    description: 'Usermangement: Benutzer löschen',
    resources: ['/api/user/:id'],
    methods: ['delete'],
    menus: ['admin.user.delete'],
  },
  usermanagement_user_read_roles: {
    description: 'Usermangement: Rollen des Benutzer anzeigen',
    resources: ['/api/user/:id/roles'],
    methods: ['get'],
    menus: ['admin.userroles'],
  },
  usermanagement_user_edit_roles: {
    description: 'Usermangement: Rollen des Benutzer ändern',
    resources: ['/api/user/:id/roles'],
    methods: ['post'],
    menus: ['admin.userroles'],
  },
  rolemanagement_role_list_read: {
    description: 'Rollenverwaltung: Rollenliste anzeigen',
    resources: ['/api/role'],
    methods: ['get'],
    menus: ['admin.roles'],
  },
  rolemanagement_role_create: {
    description: 'Rollenverwaltung: neue Rolle anlegen',
    resources: ['/api/role'],
    methods: ['put'],
    menus: ['admin.role', 'admin.roles'],
  },
  rolemanagement_role_read: {
    description: 'Rollenverwaltung: Rolle anzeigen',
    resources: ['/api/role/:id'],
    methods: ['get'],
    menus: ['admin.role'],
  },
  rolemanagement_role_update: {
    description: 'Rollenverwaltung: Rolle ändern',
    resources: ['/api/role/:id', '/api/permissionprofile'],
    methods: ['get', 'post'],
    menus: ['admin.role', 'admin.roles'],
  },
  rolemanagement_role_delete: {
    description: 'Rollenverwaltung: Rolle löschen',
    resources: ['/api/role/:id'],
    methods: ['delete'],
    menus: ['admin.role', 'admin.roles'],
  },
  rolemanagement_role_permission_read: {
    description: 'Rollenverwaltung: Berechtigungen von Rolle anzeigen',
    resources: ['/api/role/:id/permissionprofile', '/api/permissionprofile'],
    methods: ['get'],
    menus: ['admin.rolepermission'],
  },
  rolemanagement_role_permission_update: {
    description: 'Rollenverwaltung: Berechtigungen von Rolle ändern',
    resources: ['/api/role/:id/permissionprofile', '/api/permissionprofile'],
    methods: ['get', 'post'],
    menus: ['admin.rolepermission', 'admin.roles'],
  },
};

export default basePermissions;
