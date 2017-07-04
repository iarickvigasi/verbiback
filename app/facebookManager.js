
const request = require('request-promise')

class FacebookManager {
  init({ appSecret, appId}) {
    this.getAppToken({ appSecret, appId }).then(appToken => this.appToken = appToken);
  }

  getAppToken({ appSecret, appId }) {

    return request(`https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`)
    .then(response => {
      try {
        const data = JSON.parse(response);
        return data.access_token;
      } catch(e) {
        throw e;
      }
    })
    .catch(err => {
      throw err;
      console.error(err);
    })
  }
}

var instance = new FacebookManager();
module.exports = instance;
