"use strict";

var _cors = _interopRequireDefault(require("cors"));
var _express = _interopRequireDefault(require("express"));
var _fs = require("fs");
var _nodeFetch = _interopRequireDefault(require("node-fetch"));
var _process = require("process");
var _backgroundApi = require("./backgroundApi.js");
var _googleAuthLibrary = require("google-auth-library");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// backports to older version of node

const keys = JSON.parse((0, _fs.readFileSync)('./keys.json').toString('utf-8'));
const generateClient = state => state === 'mobile' ? 'https://riverrun.app/mobile' : state === 'web' ? 'https://riverrun.app' : state === 'localhost' ? 'http://localhost:3000' : 'ERROR';
const SERVER = process.env.NODE_ENV === 'production' ? 'https://riverrun.app/server' : 'http://localhost:3001/server';
console.log('process.env.NODE_ENV', process.env.NODE_ENV);
var _exports = {};
const app = (0, _express.default)();
const port = process.env.PORT || 3001;
const ORIGINS = ['capacitor://localhost', 'http://localhost:3000', 'https://riverrun.app'];
app.use('/server/request', (0, _cors.default)({
  origin: ORIGINS
}), _express.default.json());
app.post('/server/request', async (req, res) => {
  console.log('THIS WORKED', req);
  try {
    const {
      type,
      action,
      data,
      access_token
    } = req.body;
    if (type === 'auth') {
      throw new Error("server backend doesn't handle Google tokens");
    } else {
      _process.stderr.write('\n---REQUEST:\n' + JSON.stringify({
        action,
        data,
        access_token,
        keys
      }));
      await (0, _backgroundApi.processRequest)(type, action, data, response => {
        res.status(200).send(response);
      },
      // @ts-ignore
      _nodeFetch.default, access_token);
    }
  } catch (err) {
    if (err.message.includes('invalid')) {
      res.status(400).send('RESET');
    } else {
      res.status(400).send(err.message);
    }
    _process.stderr.write('\n' + err.message);
  }
});
app.get('/server/login/notion', (0, _cors.default)({
  origin: ['https://api.notion.com']
}), async (req, res) => {
  const {
    code,
    state
  } = req.query;
  try {
    const basicHeader = Buffer.from(`${keys.notion.client_id}:${keys.notion.client_secret}`, 'utf-8').toString('base64');
    (0, _nodeFetch.default)('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicHeader}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SERVER + '/login/notion'
      })
    }).then(async token => {
      const notion_tokens = await token.text(); // pass on JSON string
      res.redirect(`${generateClient(state)}?notion_tokens=${notion_tokens}`);
    });
  } catch (err) {
    _process.stderr.write('\nERROR ---\n' + err.message);
    res.redirect(`${generateClient(state)}?error=${err.message}`);
  }
});
app.get('/server/login/google', (0, _cors.default)({
  origin: ['https://accounts.google.com']
}), async (req, res) => {
  const {
    code,
    state
  } = req.query;
  try {
    const oAuth2Client = new _googleAuthLibrary.OAuth2Client(keys.google.client_id, keys.google.client_secret, SERVER + '/login/google');
    const token = await oAuth2Client.getToken(code);
    const formattedTokens = {
      access_token: token.tokens.access_token,
      refresh_token: token.tokens.refresh_token,
      expire_time: token.tokens.expiry_date
    };
    res.redirect(`${generateClient(state)}?google_tokens=${JSON.stringify(formattedTokens)}`);
  } catch (err) {
    _process.stderr.write('\nERROR ---\n' + err.message);
    res.redirect(`${generateClient(state)}?error=${err.message}`);
  }
});
app.post('/server/login/google/refresh', (0, _cors.default)({
  origin: ORIGINS
}), _express.default.json(), async (req, res) => {
  try {
    const {
      refresh_token
    } = req.body;
    const oAuth2Client = new _googleAuthLibrary.OAuth2Client(keys.google.client_id, keys.google.client_secret, SERVER + '/login/google/refresh');
    oAuth2Client.setCredentials({
      refresh_token
    });
    const newCredentials = await oAuth2Client.getAccessToken();
    res.send({
      access_token: newCredentials.token,
      expire_time: oAuth2Client.credentials.expiry_date
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});
app.listen(port, () => console.log('listening on port', port, 'from', SERVER));