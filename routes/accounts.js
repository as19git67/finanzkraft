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
      account.readers = account.reader ? convertToInteger(account.reader.split(',')) : [];
      delete account.reader;
      account.writers = account.writer ? convertToInteger(account.writer.split(',')) : [];
      delete account.writer;
    });
    res.json(accounts);
  }).catch((reason) => {
    console.log(reason);
    res.send(500);
  });
});

export default rc;