const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const User = require('../app/models/users');
const configAuth = require('./auth');

const passportConfig = (passport) => {
  console.log('Configuring passport');
  // =========================================================================
  // passport session setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  // =========================================================================
  // FACEBOOK ================================================================
  // =========================================================================
  passport.use(new FacebookStrategy({
      clientID        : configAuth.facebookAuth.clientID,
      clientSecret    : configAuth.facebookAuth.clientSecret,
      callbackURL     : configAuth.facebookAuth.callbackURL
  },
  (token, refreshToken, profile, done) => {
    process.nextTick(function() {
      // find the user in the database based on their facebook id
      User.findOne({
        'facebook.id': profile.id
      }, (err, user) => {
        // if there is an error, stop everything and return that
        // ie an error connecting to the database
        if (err) return done(err);

        // if the user is found, then log them in
        if (user) {
          return done(null, user); // user found, return that user
        } else {
          // if there is no user found with that facebook id, create them
          var newUser = new User();
          // set all of the facebook information in our user model
          newUser.facebook.id = profile.id; // set the users facebook id
          newUser.facebook.token = token; // we will save the token that facebook provides to the user
          newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
          newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
          // save our user to the database
          newUser.save((err) => {
            if (err)
              throw err;
            // if successful, return the new user
            return done(null, newUser);
          });
        }
      });
    });
  }));

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  passport.use('local-signup', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
    (req, email, password, done) => {
      // asynchronous
      // User.findOne wont fire unless data is sent back
      process.nextTick(() => {
        console.log('Signuping');

        User.findOne({
          'local.email': email
        }, (err, user) => {
          // if there are any errors, return the error
          if (err) {
            console.error(err);
            return done(err);
          }

          // check to see if theres already a user with that email
          if (user) {
            return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
          } else {
            // if there is no user with that email
            // create the user
            const newUser = new User();
            // set the user's local credentials
            newUser.local.email = email;
            newUser.local.password = newUser.generateHash(password);

            // save the user
            newUser.save((err) => {
              if (err){
                console.error(err);
                throw err;
              }
              console.log('User saved');
              return done(null, newUser);
            });
          }

        });

      });

    }));

  passport.use('local-login', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
    (req, email, password, done) => {

      User.findOne({
        'local.email': email
      }, function(err, user) {
        if (err)
          return done(err);

        if (!user)
          return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

        if (!user.validPassword(password))
          return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

        return done(null, user);
      });

    }));

  };

module.exports = passportConfig;
