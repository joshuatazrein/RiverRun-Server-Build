"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processRequest = void 0;
var _client = require("@notionhq/client");
var _lodash = _interopRequireDefault(require("lodash"));
var _process = require("process");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const processRequest = async (type, action, data, sendResponse, fetchFunction, access_token) => {
  let response;
  if (type === 'google') {
    const gRequest = async (url, method = 'GET', params, data, stripKeys) => {
      {
        if (stripKeys && data) {
          data = _lodash.default.omit(data, stripKeys);
        }
      }
      try {
        const f = await fetchFunction(url + (params ? '?' + new URLSearchParams(params) : ''), {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          method,
          body: data ? JSON.stringify(data) : undefined
        });
        let result;
        const textResponse = await f.text();
        try {
          result = JSON.parse(textResponse);
        } catch (err) {
          result = textResponse;
        }

        // pass back the new tokens back to the app for storage
        return result;
      } catch (err) {
        _process.stderr.write(`\nERROR AT ${new Date().toDateString()}: ${err.message}, from request ${action} with data:\n    ${JSON.stringify(data)}`);
        return 'ERROR: ' + err.message;
      }
    };
    switch (action) {
      case 'events.insert':
        response = await gRequest(`https://www.googleapis.com/calendar/v3/calendars/${data.calendarId}/events`, 'POST', undefined, data, ['calendarId']);
        break;
      case 'events.delete':
        response = await gRequest(`https://www.googleapis.com/calendar/v3/calendars/${data.calendarId}/events/${data.eventId}`, 'DELETE');
        break;
      case 'events.patch':
        response = await gRequest(`https://www.googleapis.com/calendar/v3/calendars/${data.calendarId}/events/${data.eventId}`, 'PATCH', undefined, data, ['calendarId', 'eventId']);
        break;
      case 'calendarList.list':
        response = await gRequest(`https://www.googleapis.com/calendar/v3/users/me/calendarList`, 'GET', data.params);
        break;
      case 'events.list':
        const cId = data.calendarId;
        delete data.calendarId;
        response = await gRequest(`https://www.googleapis.com/calendar/v3/calendars/${cId}/events`, 'GET', data.params);
        if (response.error) {
          response = {
            items: [],
            error: response.error
          };
        }
        break;
      default:
        break;
    }
  } else if (type === 'notion') {
    let notion;
    notion = new _client.Client({
      auth: access_token
    });
    switch (action) {
      case 'search':
        response = await notion.search(data);
        break;
      case 'databases.retrieve':
        response = await notion.databases.retrieve(data);
        break;
      case 'databases.query':
        response = await (0, _client.collectPaginatedAPI)(notion.databases.query, data);
        break;
      case 'pages.update':
        response = await notion.pages.update(data);
        break;
      case 'pages.create':
        response = await notion.pages.create(data);
        break;
      case 'pages.retrieve':
        response = await notion.pages.retrieve(data);
        break;
      case 'pages.properties.retrieveRelation':
        // only works with relations and other paginated properties
        response = await (0, _client.collectPaginatedAPI)(notion.pages.properties.retrieve, data);
        break;
      default:
        break;
    }
  }
  console.log('GOT RESPONSE:', response);
  sendResponse(response);
};
exports.processRequest = processRequest;