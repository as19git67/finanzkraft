import {AsRouteConfig} from 'as-express';

const rc = new AsRouteConfig('/');

rc.put((req, res, next) => {
  const ruleInfo = req.body;
  const db = req.app.get('database');
  db.createRuleSet(ruleInfo).then((id) => {
    res.send({ id });
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.sendStatus(422);
        break;
      default:
        console.error(error);
        res.sendStatus(500);
    }
  });
});

export default rc;