import {AsRouteConfig} from 'as-express';

const rc = new AsRouteConfig('/:idRuleSet');

rc.get(function (req, res, next) {
  const {idRuleSet} = req.params;
  if (idRuleSet === undefined) {
    res.send(404);
    return;
  }
  const db = req.app.get('database');
  db.getRuleSet(idRuleSet).then((ruleInfo) => {
    res.json(ruleInfo);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

rc.post(function (req, res, next) {
  const {idRuleSet} = req.params;
  if (idRuleSet === undefined) {
    res.send(404);
    return;
  }
  const ruleInfo = req.body;
  ruleInfo.id = idRuleSet;
  const db = req.app.get('database');
  db.updateRuleSet(ruleInfo).then(() => {
    res.sendStatus(200);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

rc.delete(function (req, res, next) {
  const {idRuleSet} = req.params;
  if (idRuleSet === undefined) {
    res.send(404);
    return;
  }
  const db = req.app.get('database');
  db.deleteRuleSet(idRuleSet).then(() => {
    res.sendStatus(200);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

export default rc;