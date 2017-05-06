'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  translate = require('google-translate-api'),
  express = require('express');

const app = express();
app.set('port', process.env.PORT || config.get('port'));
app.set('address', process.env.ADDRESS || config.get('address'));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/translate', (req, res) => {
  console.log('Got translate request!', req.query.toString());
  const { word, to } = req.query;

  if (!word || !to) {
    res.status(400).send('Please provide "word" and "to" properites');
    return;
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


const server = app.listen(app.get('port'), app.get('address'), () => {
  console.log('Yay! Poly Vocab Server is running at %s:%s', server.address().address, server.address().port);
});
