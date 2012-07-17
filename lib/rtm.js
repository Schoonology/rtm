var request = require('request'),
    Q = require('Q'),
    _ = require('lodash'),
    crypto = require('crypto');

function RTMClient(options) {
    if (options == null) {
        options = {};
    }

    this.apiKey = options.apiKey || null;
    this.secret = options.secret || null;
}

RTMClient.prototype.getAPISig = function(method, options) {
    if (this.secret == null) {
        return null;
    }

    var md5 = crypto.createHash('md5'),
        input = this.secret + Object.keys(options).sort().reduce(function (hash, key) {
            return hash + key + options[key];
        }, ''),
        hash = md5.update(input).digest('hex');

    return hash;
};

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

    qs.api_sig = this.getAPISig(qs);

    request.post({
        url: 'https://api.rememberthemilk.com/services/rest/',
        qs: qs
    });
};

RTMClient.prototype.echo = function(options, callback) {
    this.makeRequest('rtm.test.echo', options, callback);
};

module.exports = RTMClient;