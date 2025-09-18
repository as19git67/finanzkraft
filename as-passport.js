import { DateTime } from 'luxon';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { BasicStrategy } from 'passport-http';

export default class AsPassport {
  #passport;

  #database;

  constructor(passport, database) {
    this.#passport = passport;
    this.#database = database;
  }

  async #serializeUser(user) {
    if (!user || !user.id) {
      throw new Error('User not specified', { cause: 'nouser' });
    }
    return user.id; // id will be stored in the session
  }

  async #deserializeUser(userId) {
    if (!userId) {
      throw new Error('userId not specified', { cause: 'nouserid' });
    }
    return this.#database.getUserById(userId);
  }

  async init() {
    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.

    // this.#passport.serializeUser((user, done) => {
    //   this.#serializeUser(user).then((userId) => {
    //     done(null, userId);
    //   }).catch((error) => {
    //     done(error, user);
    //   });
    // });

    // this.#passport.deserializeUser((userId, done) => {
    //   this.#deserializeUser(userId).then((user) => {
    //     done(null, user);
    //   }).catch((error) => {
    //     done(error, userId);
    //   });
    // });

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
