import base64url from 'base64url';
import passport from 'passport';

class AuthController {
  passportCheck () {
    return passport.authenticate('webauthn', {
      failureMessage: true,
      failWithError: true,
    });
  }

  admitUser (req, res, next) {
    res.json(req.user);
  }

  denyUser (err, req, res, next) {
    const cxx = Math.floor(err.status / 100);
    if (cxx != 4) return next(err);
    res.json({ ok: false, destination: '/login' });
  }

  login (req, res) {
    res.render('auth/login');
  }

  getChallengeFrom (store) {
    return (req, res, next) => {
      store.challenge(req, (err, challenge) => {
        if (err) return next(err);
        res.json({ challenge: base64url.encode(challenge) });
      });
    };
  }

  logout (req, res, next) {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  }

  register (req, res) {
    res.render('auth/register');
  }

  createChallengeFrom (store) {
    return async (req, res, next) => {

      try {
        // todo: fail if user already exists
        const db = req.app.get('database');
        const { email } = req.body;
        const { password } = req.body;
        if (!email || !email.trim()) {
          console.log('Can\'t create user with empty email');
          next(new Error('Can\'t create user with empty email', { cause: 'invalid' }));
          return;
        }
        if (!password || !password.trim()) {
          console.log('Can\'t create user with empty password');
          next(new Error('Can\'t create user with empty email', { cause: 'invalid' }));
          return;
        }
        const emailTrimmed = email.trim();
        const userId = await db.createUser(emailTrimmed, password);
        console.log(`Created user ${emailTrimmed} with id ${userId}`);
        const user = { id: userId.toString(), name: emailTrimmed, displayName: emailTrimmed };
        user.id = base64url.encode(user.id);

        store.challenge(req, { user }, function (err, challenge) {
          if (err) {
            console.log('store.challenge called in createChallengeFrom failed with error:', err);
            return next(err);
          }
          res.json({ user: user, challenge: base64url.encode(challenge) });
        });
      } catch (error) {
        console.log('createChallengeFrom failed with exception:', error);
        next(error);
      }

    };
  }
}

export default AuthController;
