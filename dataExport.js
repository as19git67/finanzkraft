import yaml from 'js-yaml';
import fs from 'fs';
import {writeFile} from "node:fs/promises";

export default async function exportData(db, exportFilename) {

  let data = {};
  try {
    data = yaml.load(fs.readFileSync(exportFilename, 'utf8'));
  } catch (ex) {
    switch (ex.code) {
      case 'ENOENT':
        console.log(`Export file ${exportFilename} does not exist. Starting with empty file.`);
        data = {};
        break;
      default:
        console.log(`Exception while opening export file ${exportFilename}: ${ex.message}`);
        throw ex;
    }
  }

  console.log('Exporting rule sets...');
  data.RuleSets = await db.getRuleSets();
  console.log(`Exported ${data.RuleSets.length} rule sets`);

  const json = JSON.stringify(data, undefined, 2);
  const dataBuffer = new Uint8Array(Buffer.from(json));
  await writeFile(exportFilename, dataBuffer, 'utf8');
  console.log(`DB export written to ${exportFilename}`);
}
