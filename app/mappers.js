
const normalizeDictionaries = dictionaries => {
  return dictionaries.map(dict => ({ languageCode: dict.languageCode, words: dict.words }))
}

module.exports = {
  normalizeDictionaries,
};
