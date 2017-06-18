const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dictionarySchema = Schema({
  userId: Schema.Types.ObjectId,
  languageCode: String,
  words: [Schema.Types.Mixed]
});

dictionarySchema.methods.addWord = function (word, done) {

  const duplicate = this.words.find(w => w.originalWord.toLowerCase() === word.originalWord.toLowerCase());
  if (duplicate) return done();

  this.words.push(word);
  this.save((err) => {
    if (err) throw err;
    done();
  });
};

dictionarySchema.methods.removeWord = function (word, done) {
  this.words = this.words.filter(w => w.originalWord !== word.originalWord);

  this.save((err) => {
    if (err) throw err;
    done();
  });
}

module.exports = mongoose.model('Dictionary', dictionarySchema);
