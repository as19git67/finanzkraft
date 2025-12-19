import express from 'express';
import AuthController from '../controllers/auth.js';
import Passport from '../services/passport.js';
import { SessionChallengeStore } from 'passport-fido2-webauthn';

class Routes {
  constructor (database) {
    this.database = database;
  }

  get router () {
    const expressRouter = express.Router();
    // Controllers
    const auth = new AuthController();

    // Passport
    const passportService = new Passport(this.database);
    const store = new SessionChallengeStore();
    passportService.init(store);

    expressRouter.get('/api/login', auth.login);
    expressRouter.post(
      '/api/passkeyLogin',
      auth.passportCheck(),
      auth.admitUser,
      auth.denyUser
    );
    expressRouter.post('/api/passkeyLoginChallenge', auth.getChallengeFrom(store));

    // expressRouter.post('/logout', auth.logout)
    //
    // expressRouter.get('/register', auth.register)
    expressRouter.post('/api/passkeyRegisterChallenge', auth.createChallengeFrom(store))
    return expressRouter;
  }
}

export default Routes;
