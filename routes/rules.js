import {AsRouteConfig} from 'as-express';

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
  try {
    const idRuleSet = await db.createRuleSet(ruleInfo);
    console.log(`RuleSet with idRuleSet ${idRuleSet} added to DB`);
    await db.applyRules({idRuleSet: idRuleSet, includeProcessed: true, includeTransactionsWithRuleSet: true});
    console.log(`RuleSet applied to transactions`);
    res.sendStatus(200);
  } catch (error) {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      default:
        console.error(error);
        if (error.message) {
          res.send(500, error.message);
        } else {
          res.sendStatus(500);
        }
    }
  }
});

export default rc;
