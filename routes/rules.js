import {AsRouteConfig} from 'as-express';

const rc = new AsRouteConfig('/');

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
        res.sendStatus(500);
    }
  }
});

export default rc;