import { DateTime } from 'luxon';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { BasicStrategy } from 'passport-http';
import { Strategy as WebAuthnStrategy, SessionChallengeStore } from 'passport-fido2-webauthn';
import passport from 'passport';
import base64url from "base64url";

class Passport {
  #db;

  constructor (database) {
    this.#db = database;
  }

  init (store) {
    passport.authenticate('session');

    // configure passport to use WebAuthn Strategy
    passport.use(new WebAuthnStrategy({ store: store },
      (id, userHandle, cb) => {
        return this.verify(id, userHandle, cb);
      }, (user, id, publicKey, cb) => {
        return this.register(user, id, publicKey, cb);
      })
    );

    // passport serialise user
    passport.serializeUser(this.serialiseUserFn);
    // passport deserialise user
    passport.deserializeUser(this.deserialiseUserFn);

    passport.use('local', this.useLocalStrategy());
    passport.use('basic', this.useBasicStrategy());
    passport.use('bearer', this.useBearerStrategy());
  }

  useLocalStrategy () {
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

  useBasicStrategy () {
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

  useBearerStrategy () {
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
  async verify (id, userHandle, cb) {
    try {
      const currentUser = await this.#db.getUserByWebAuthCredential(id);

      if (!currentUser) {
        return cb(null, false, { message: 'Invalid passkey' });
      }

      const idBuffer = Buffer.from(currentUser.id.toString(), 'ascii');
      if (Buffer.compare(idBuffer, userHandle) !== 0) {
        return cb(null, false, { message: 'Handles do not match. ' });
      }

      return cb(null, currentUser, currentUser.WebAuthnUserCredentials_publicKey);
    } catch (error) {
      console.log(error);
      return cb(null, false);
    }
  }

  // Register callback
  async register (user, id, publicKey, done) {
    try {
      console.log(`Registering WebAuthn user id: ${user.id}`);

      // convert Uint8Array back to string
      const userIdBase64 = new TextDecoder().decode(user.id);
      const userId = base64url.decode(userIdBase64);
      const savedUser = await this.#db.storeWebAuthCredential(userId, id, publicKey);
      return done(null, savedUser);
    } catch (error) {
      return done(error);
    }
  }
}

export default Passport;
