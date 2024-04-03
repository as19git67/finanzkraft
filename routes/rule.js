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

rc.post(async function (req, res, next) {
  const {idRuleSet} = req.params;
  if (idRuleSet === undefined) {
    res.send(404);
    return;
  }
  const { ruleInfo, includeProcessed } = req.body;
  ruleInfo.id = idRuleSet;
  //const includeProcessed = req.body.includeProcessed !== undefined ? req.body.includeProcessed : false;
  const db = req.app.get('database');
  const trx = await db.startTransaction();

  try {
    await db.updateRuleSet(trx, ruleInfo, true);
    console.log(`RuleSet with idRuleSet ${idRuleSet} updated in DB`);
    await db.applyRules(trx, {idRuleSet: idRuleSet, includeProcessed: includeProcessed, includeTransactionsWithRuleSet: true});
    trx.commit();
    console.log(`RuleSet applied to transactions`);
    res.sendStatus(200);
  } catch (error) {
    trx.rollback();
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  }
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
