import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  db.getRuleSets().then((ruleSets) => {
    res.json(ruleSets);
  }).catch((reason) => {
    console.log(reason);
    res.sendStatus(500);
  });
});

rc.put(async (req, res, next) => {
  const ruleInfo = req.body;
  const db = req.app.get('database');
  const trx = await db.startTransaction();

  try {
    const idRuleSet = await db.createRuleSet(trx, ruleInfo);
    console.log(`RuleSet with idRuleSet ${idRuleSet} added to DB`);
    await db.applyRules(trx, {idRuleSet: idRuleSet, includeProcessed: true, includeTransactionsWithRuleSet: true});
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
        if (error.message) {
          res.status(500).send(error.message);
        } else {
          res.sendStatus(500);
        }
    }
  }
});

export default rc;
