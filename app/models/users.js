const mongoose = require('mongoose'),
      bcrypt = require('bcrypt-nodejs');

      const Schema = mongoose.Schema;

const userSchema = Schema({
  local : {
    email       : String,
    password    : String
  },
  dictionaries: [ Schema.Types.ObjectId ]
});

userSchema.methods.generateHash = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.local.password);
};

userSchema.methods.addDictionary = function(dictionaryId, done) {
  this.dictionaries.push(dictionaryId);
  this.save((err) => {
    if (err) throw err;
    done();
  })
}

module.exports = mongoose.model('User', userSchema);
