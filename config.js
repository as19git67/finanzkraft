import yaml from 'js-yaml';
import fs from 'fs';
import _ from 'lodash';

const settingsFilename = 'settings.yaml';
let settings = {};
if (fs.existsSync(settingsFilename)) {
  try {
    settings = yaml.load(fs.readFileSync(settingsFilename, 'utf8'));
  } catch (ex) {
    console.log(`${ex.message}: can't read ${settingsFilename}. Using defaults only.`);
  }
}

const config = {};
_.defaults(config, settings, {
  dataDirectory: '/data',
  authConfigDirectory: '/data',
  httpPort: 3000,
  dbClient: 'sqlite3',
  dBFilename: './ascloudp.sqlite',
  dbHost: '127.0.0.1',
  dbPort: 1433,
  dbName: 'ascloudp',
  dbUsername: 'somebody',
  dbPassword: 'secret',
  dbDebug: false,
  adminUser: 'admin@example.com',
  initialAdminPassword: '',
  tokenLifetimeInMinutes: '600',
  'express-session-secret': 'geheimnis',
  CORS_origin: true,
  importDatafile: '',
  exportDatafile: '',
  exportDatafileWithTimestamp: false,
});

export default config;
