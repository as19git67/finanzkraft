import AsRouteConfig from '../as-router.js';
import _ from 'lodash';

const rc = new AsRouteConfig('/');

rc.get(function(req, res, next) {
  const idUser = req.user.id;
  const {idPreset} = req.params;
  const db = req.app.get('database');
  db.getNewTransactionPresets(idUser, idPreset).then((presets) => {
    const presetObj = JSON.parse(presets);
    res.json(presetObj);
  });
});

rc.post(async function(req, res, next) {
  try {
    const idUser = req.user.id;
    const presets = req.body;
    if (!_.isArray(presets)) {
      res.sendStatus(400);
      console.log('Request body is not an array');
      return;
    }
    if (presets.length === 0) {
      console.log('Ignoring empty update of newTransactionPreset');
      res.sendStatus(200);
      return;
    }
    const db = req.app.get('database');
    await db.updateNewTransactionPresets(idUser, presets);
    console.log(`NewTransactionPresets of userId ${idUser} updated in DB`);
    res.sendStatus(200);
  } catch (ex) {
    console.error(ex);
    res.sendStatus(500);
  }
});

rc.delete(async function(req, res, next) {
  try {
    const idUser = req.user.id;
    const db = req.app.get('database');
    await db.deleteNewTransactionPresets(idUser);
    res.sendStatus(200);
  } catch (ex) {
    console.error(ex);
    res.sendStatus(500);
  }
});

export default rc;
