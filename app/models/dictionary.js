const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dictionarySchema = Schema({
  userId: Schema.Types.ObjectId,
  languageCode: String,
  words: [Schema.Types.Mixed]
});

dictionarySchema.methods.addWord = function (word, done) {
  this.words.push(word);
  this.save((err) => {
    if (err) throw err;
    done();
  });
};

module.exports = mongoose.model('Dictionary', dictionarySchema);
