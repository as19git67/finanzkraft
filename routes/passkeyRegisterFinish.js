import AsRouteConfig from '../as-router.js';

const rc = new AsRouteConfig('/');

passportCheck() {
  return passport.authenticate('webauthn', {
    failureMessage: true,
    failWithError: true,
  })
}

rc.post((req, res, next) => {
  const db = req.app.get('database');
});

export default rc;
