import { DateTime } from 'luxon';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { BasicStrategy } from 'passport-http';
import { Strategy as WebAuthnStrategy, SessionChallengeStore } from 'passport-fido2-webauthn';
import passport from 'passport';

class PassportService {
  #db;

  constructor (database) {
    this.#db = database;
  }

  init (store) {
    // 1. configure passport to use WebAuthn Strategy
    passport.use(this.useWebauthnStrategy(store));
    // 2. passport serialise user
    passport.serializeUser(this.serialiseUserFn);
    // 3. passport deserialise user
    passport.deserializeUser(this.deserialiseUserFn);

    passport.use('local', this.useLocalStrategy());
    passport.use('basic', this.useBasicStrategy());
    passport.use('bearer', this.useBearerStrategy());
  }

  useWebauthnStrategy (store) {
    return new WebAuthnStrategy({ store: store }, this.verify, (user, id, publicKey, done) => { this.register(user, id, publicKey, done); });
  }

  useLocalStrategy() {
    return new LocalStrategy((email, password, done) => {
      console.log('LOCAL STRATEGY', email);

      this.#db.validateUser(email, password)
        .then((user) => {
          done(null, user);
        })
        .catch((error) => {
          done(error);
        });
    });
  }

  useBasicStrategy() {
    return new BasicStrategy((email, password, done) => {
      console.log('BASIC STRATEGY', email);

      this.#db.validateUser(email, password)
        .then((user) => {
          done(null, user);
        })
        .catch((error) => {
          done(error);
        });
    });
  }

  useBearerStrategy() {
    return new BearerStrategy((accessToken, done) => {
      //console.log('BEARER Strategy');
      this.#db.getUserByAccessToken(accessToken).then((user) => {
        if (!user) {
          done(null, false, { message: 'user undefined' });
          return;
        }
        const now = DateTime.now();
        if (now > user.ExpiredAfter) {
          const error = new Error(`User with id ${user.id} is expired`);
          console.log(error.message);
          done(null, false, { message: 'user expired' });
          return;
        }
        if (now > user.AccessTokenExpiredAfter) {
          const error = new Error(`AccessToken for user with id ${user.id} is expired`);
          console.log(error.message);
          done(null, false, { message: 'access token expired' });
          return;
        }

        done(null, user);
      }).catch((error) => {
        console.error('database.getUserByAccessToken failed');
        done(error);
      });
    });
  }

  // Serialise user to token
  serialiseUserFn (user, done) {
    process.nextTick(() => {
      if (user.id && user.Email) {
        done(null, user);
      } else {
        done(new Error('User not specified', { cause: 'nouser' }));
      }
    });
  }

  // Deserialise user from token
  deserialiseUserFn (user, done) {
    process.nextTick(() => {
      return done(null, user);
    });
  }

  // Verify callback
  async verify (id, userHandle, done) {
    const transaction = await this.#db.transaction();
    try {
      const currentCredentials = await models.PublicKeyCredentials.findOne({
        where: { external_id: id },
      }, { transaction });

      if (currentCredentials === null) {
        return done(null, false, { message: 'Invalid key. ' });
      }

      const currentUser = await models.User.findOne({
        where: { id: currentCredentials.user_id },
      }, { transaction });

      if (currentUser === null) {
        return done(null, false, { message: 'No such user. ' });
      }

      if (Buffer.compare(currentUser.handle, userHandle) != 0) {
        return done(null, false, { message: 'Handles do not match. ' });
      }

      await transaction.commit();

      return done(null, currentCredentials, currentCredentials.public_key);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Register callback
  async register (user, id, publicKey, done) {
    try {
      console.log(`Registering WebAuthn user id: ${id}`);

      // convert Uint8Array back to string
      const userId = new TextDecoder().decode(user.id);

      const savedUser = await this.#db.storeWebAuthCredential(userId, id, publicKey);
      return done(null, savedUser);
    } catch (error) {
      return done(error);
    }
  }
}

export default PassportService;
