import { DateTime } from 'luxon';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { BasicStrategy } from 'passport-http';
import { Strategy as WebAuthnStrategy, SessionChallengeStore} from 'passport-fido2-webauthn';

export default class AsPassport {
  #passport;
  #database;
  #store;

  constructor(passport, database) {
    this.#passport = passport;
    this.#database = database;
  }

  get sessionChallengeStore() {
    return this.#store;
  }

  async #serializeUser(user) {
    if (!user || !user.id) {
      throw new Error('User not specified', { cause: 'nouser' });
    }
    return user; // id will be stored in the session
  }

  async #deserializeUser(user) {
    if (!user || !user.id) {
      throw new Error('User not specified', { cause: 'nouser' });
    }
    return this.#database.getUserById(user.id);
  }

  async verify(id, userHandle, done) {
    console.log("Verifying WebAuthn user");
    const user = await this.#database.getUserByWebAuthCredential(id);
    if (!user) {
      return done(null, false, { message: 'Invalid key.' });
    }
    return done(null, user.UserCredential_id, user.UserCredential_publicKey)
  }

  async register(user, id, publicKey, done) {
    console.log(`Registering WebAuthn user id: ${id}`);

    // convert Uint8Array back to string
    const userId = new TextDecoder().decode(user.id);

    try {
      const user = await this.#database.storeWebAuthCredential(userId, id, publicKey);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }

  async init() {
    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.

    this.#passport.serializeUser((user, done) => {
      try {
        this.#serializeUser(user);
        done(null, user);
      } catch (error) {
        return done(error);
      }
    });

    this.#passport.deserializeUser((user, done) => {
      try {
        this.#deserializeUser(user);
        done(null, user);
      } catch (error) {
        return done(error);
      }
    });

    // passkey support
    this.#store = new SessionChallengeStore();

    // https://github.com/divrhino/divrhino-passkeys-express/blob/main/config/routes.js
    this.#passport.use(new WebAuthnStrategy({ store: this.#store },
      (id, userHandle, done) => {
        this.verify(id, userHandle, done);
      },
      (user, id, publicKey, done) => {
        this.register(user, id, publicKey, done);
      }
    ));

    this.#passport.use('bearer', new BearerStrategy((accessToken, done) => {
      //console.log('BEARER Strategy');
      this.#database.getUserByAccessToken(accessToken).then((user) => {
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
    }));

    this.#passport.use('basic', new BasicStrategy((email, password, done) => {
      console.log('BASIC STRATEGY', email);

      this.#database.validateUser(email, password)
        .then((user) => {
          done(null, user);
        })
        .catch((error) => {
          done(error);
        });
    }));

    this.#passport.use('local', new LocalStrategy((email, password, done) => {
      console.log('LOCAL STRATEGY', email);

      this.#database.validateUser(email, password)
        .then((user) => {
          done(null, user);
        })
        .catch((error) => {
          done(error);
        });
    }));
  }
}
