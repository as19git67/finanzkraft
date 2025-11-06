import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

rc.post((req, res, next) => {
  const db = req.app.get('database');
}, {bypassAuth: true});

export default rc;
