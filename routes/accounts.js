import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

function convertToInteger(ids) {
  const arr = [];
  ids.forEach(id => {
    arr.push(parseInt(id));
  });
  return arr;
}

rc.get(function (req, res, next) {
  const db = req.app.get('database');
  db.getAccounts().then((accounts) => {
    accounts.forEach((account) => {
      account.reader = account.reader ? convertToInteger(account.reader.split(',')) : [];
      account.writer = account.writer ? convertToInteger(account.writer.split(',')) : [];
    });
    res.json(accounts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

export default rc;