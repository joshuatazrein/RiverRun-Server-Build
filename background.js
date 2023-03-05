"use strict";

var _backgroundApi = require("./backgroundApi.js");
var _keys = _interopRequireDefault(require("../keys.json"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
chrome.runtime.onMessage.addListener(({
  type,
  action,
  data,
  access_token
}, sender, sendResponse) => {
  if (type === 'auth') {
    switch (action) {
      case 'notion.getToken':
        const basicHeader = btoa(`${_keys.default.notion.client_id}:${_keys.default.notion.client_secret}`);
        fetch('https://api.notion.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicHeader}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: data.code,
            redirect_uri: `https://hahgpoibcnamhkofphkaibhjcfogbkbl.chromiumapp.org`
          })
        }).then(async token => {
          const notion_tokens = await token.json();
          sendResponse({
            notion_tokens
          });
        }, error => {});
        break;
      case 'google.getToken':
        chrome.identity.getAuthToken({}, token => sendResponse(token));
        break;
    }
  } else {
    if (access_token === 'GOOGLE_TOKEN') {
      chrome.identity.getAuthToken({}, access_token => (0, _backgroundApi.processRequest)(type, action, data, sendResponse, fetch, access_token));
    } else {
      (0, _backgroundApi.processRequest)(type, action, data, sendResponse, fetch, access_token);
    }
  }
  return true;
});