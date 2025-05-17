import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const idUser = req.user.id;
  const {idPreset} = req.params;
  const db = req.app.get('database');
  db.getNewTransactionPresets(idUser, idPreset).then((presets) => {
    res.json(presets);
  });
});

rc.post(async function (req, res, next) {
  const idUser = req.user.id;
  const updateData = _.pick(req.body, 'value', 'description');
  if (Object.keys(updateData).length === 0) {
    console.log('Ignoring empty update of newTransactionPreset');
    res.sendStatus(200);
    return;
  }
  const db = req.app.get('database');
  await db.updateNewTransactionPresets(idUser, updateData);
  console.log(`Preference(${this.key}) of userId ${idUser} updated in DB`);
  res.sendStatus(200);
});

rc.delete(function (req, res, next) {
  const idUser = req.user.id;
  const db = req.app.get('database');
  db.deleteNewTransactionPresets(idUser).then(() => {
    res.sendStatus(200);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

export default rc;
