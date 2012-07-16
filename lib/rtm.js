var request = require('request'),
    Q = require('Q'),
    _ = require('lodash');

function RTMClient(options) {
    if (options == null) {
        options = {};
    }

    this.apiKey = options.apiKey || null;
}

RTMClient.prototype.makeRequest = function(method, options, callback) {
    if (options == null) {
        options = {};
    }

    var format = options.format || (options.json ? 'json' : 'xml'),
        qs = _.extend({}, options, {
            method: method,
            format: format,
            api_key: this.apiKey
        });

    request.post({
        url: 'https://api.rememberthemilk.com/services/rest/',
        qs: qs
    });
};

RTMClient.prototype.echo = function(options, callback) {
    this.makeRequest('rtm.test.echo', options, callback);
};