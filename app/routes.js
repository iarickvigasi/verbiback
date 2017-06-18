const jwt = require('jsonwebtoken');
const translate = require('google-translate-api');

const User = require('./models/users');
const Dictionary = require('./models/dictionary');
const config = require('../config/auth');

const Mappers = require('./mappers');

const routes = (app) => {

  const verifyToken = (req, res, next) => {
      console.log('verifying token')
      const token = req.headers['x-access-token'];

      if (!token) return res.status(403).send({
        success: false,
        message: 'No token provided in "x-access-token" header'
      });

      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) return res.send({ success: false, message: 'Invalid token'});

        req.decoded = decoded;
        console.log('verified', req.decoded);
        req.token = token;
        next();
      });
  };

  const getUser = (req, res, next) => {
    const { _id: userId } = req.decoded;
    User.findOne({ _id: userId}, (err, user) => {
      if (err) throw err;

      if (!user) {
        return res.status(400).json({ success: false, message: 'Incorrect token data.' });
      }

      req.user = user;
      next();
    });
  };

  app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Required email and password fields.' })
    }

    const isValidEmail = validateEmail(email);
    if(!isValidEmail) return res.status(400).json({ success: false, message: 'Email not valid.' })

    process.nextTick(() => {
      User.findOne({ 'local.email': email }, (err, user) => {
        if (err) throw err;

        if (user) return res.status(400).json({ success: false, message: 'Email already taken.'})

        const newUser = User.create({local: { email }}, (err, createdUser) => {
          if (err) throw err;
          console.log('user', newUser);
          createdUser.local.password = createdUser.generateHash(password);
          createdUser.save(err => {
            if (err) throw err;
            return res.status(200).json({ success: true, message: 'User registered successfully.'})
          });
        });
      });
    });
  });

  app.post('/authenticate', (req, res) => {
    const { email, password } = req.body;
    console.log('Boyd', req.body);
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Required email and password fields.' })
    }

    process.nextTick(() => {
      User.findOne({ 'local.email': email }, (err, user) => {
        if (err) throw err;

        if (!user) {
          return res.status(400).json({ success: false, message: 'Authentication failed. User not found.' });
        }

        if (!user.validPassword(password)) {
          return res.status(400).json({ success: false, message: 'Authentication failed. Wrong pasword.' });
        }
        const token = jwt.sign(user._doc, config.secret, { expiresIn: '124h' });
        return res.status(200).json({ success: true, token });
      });
    });
  });

  app.post('/authorizate', verifyToken, (req, res) => {
    res.status(200).json({ success: true, token: req.token });
  });

  app.post('/words/save', verifyToken, getUser, (req, res) => {
    const { user } = req;
    const { wordLanguage, originalWord, translation } = req.body;

    if (!wordLanguage || !originalWord || !translation) return res.status(400).send('Incorrect request. Not all fields presented.');

    Dictionary.find({ _id: { $in: user.dictionaries }}, (err, dictionaries) => {
      if (err) throw err;
      if (!dictionaries) return res.status(500).json({ success: false, message: 'Invalid user accout'});

      const dictionary = dictionaries.find(dict => dict.languageCode == wordLanguage);
      console.log("Dict", dictionary);

      if (!dictionary) {
        const dict = Dictionary.create({
          languageCode: wordLanguage,
          userId: user.userId,
          words: [{ originalWord, translation }]
        }, (err, dict) => {
          if (err) throw err;

          user.addDictionary(dict.id, () => {
            res.status(200).json({ success: true });
          });
        });
      }
      else {
        dictionary.addWord({ originalWord, translation }, (err) => {
          res.status(200).json({ success: true });
        });
      }
    });
  });

  app.post('/words/delete', verifyToken, getUser, (req, res) => {
    const { user } = req;
    const { wordLanguage, originalWord, translation } = req.body;

    if (!wordLanguage || !originalWord || !translation) return res.status(400).send('Incorrect request. Not all fields presented.');

    Dictionary.find({ _id: { $in: user.dictionaries }}, (err, dictionaries) => {
      if (err) throw err;
      if (!dictionaries) return res.status(500).json({ success: false, message: 'Invalid user accout'});

      const dictionary = dictionaries.find(dict => dict.languageCode == wordLanguage);
      console.log("Dict", dictionary);

      if (!dictionary) {
        res.status(200).json({ success: true });
      }
      else {
        dictionary.removeWord({ originalWord, translation }, (err) => {
          res.status(200).json({ success: true });
        });
      }
    });
  });

  app.get('/words/all', verifyToken, getUser, (req, res) => {
    const { user } = req;

    Dictionary.find({ _id: { $in: user.dictionaries }}, (err, dictionaries) => {
      if (err) throw err;

      if (!dictionaries) {
        return res.status(400).json({ success: false, message: 'No dictionaries.' });
      }

      const dictionariesNormalized = Mappers.normalizeDictionaries(dictionaries);
      return res.status(200).json({ success: true, dicts: dictionariesNormalized });
    });
  });

  app.get('/words', verifyToken, (req, res) => {
    const { _id: userId } = req.decoded;
    const languageCode = req.query.lc;

    if (!languageCode) return res.status(400).json({ success: false, message: 'No data provided. '});

    User.findOne({ _id: userId}, (err, user) => {
      if (err) throw err;

      if (!user) {
        return res.status(400).json({ success: false, message: 'Incorrect token data.' });
      }

      Dictionary.find({ _id: { $in: user.dictionaries }}, (err, dictionaries) => {
        if (err) throw err;

        if (!dictionaries) {
          return res.status(400).json({ success: false, message: 'No dictionaries.' });
        }

        const dictionary = dictionaries.find(dict => dict.languageCode == languageCode);
        if (!dictionary) return res.status(400).json({ success: false, message: `No dictionary with language code: ${languageCode}`});

        return res.status(200).json({ success: true, words: dictionary.words });
      });
    });
  });

  // @TODO: Move to translate routes
  app.get('/translate', verifyToken, (req, res) => {
    console.log('Got translate request!', req.query.toString());
    const { word, to } = req.query;

    if (!word || !to) {
      return res.status(400).send('Please provide "word" and "to" properites');
    }

    translate(word, { to }).then(tres => {
      console.log('Processed translation', tres);
      res.status(200).send(tres);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  });
}

const validateEmail = email => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};

module.exports = routes;
