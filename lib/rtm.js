var request = require('request'),
    _ = require('lodash'),
    crypto = require('crypto'),
    url = require('url');

// TODO: Check validity of callback functions before using.

function RTMClient(options) {
    if (options == null) {
        options = {};
    }

    this.apiKey = options.apiKey || null;
    this.secret = options.secret || null;
    this.token = options.token || null;
    this.timeline = options.timeline || null;

    this.frob = null;
}

RTMClient.prototype.toJSON = function() {
    return JSON.stringify({
        apiKey: this.apiKey,
        secret: this.secret,
        token: this.token
    });
};

RTMClient.prototype.getAPISig = function(method, options) {
    if (this.secret == null) {
        return null;
    }

    if (typeof method === 'object') {
        options = method;
        method = null;
    }

    if (options == null) {
        options = {};
    }

    var md5 = crypto.createHash('md5'),
        input = this.secret + Object.keys(options).sort().reduce(function(hash, key) {
            return hash + key + options[key];
        }, ''),
        hash = md5.update(input).digest('hex');

    // console.log('Input:', input);

    return hash;
};

RTMClient.prototype.makeRequest = function(method, options, callback) {
    if (options == null) {
        options = {};
    }

    var format = options.format || (options.json === false ? 'xml' : 'json'),
        qs = _.extend({}, options, {
            method: method,
            format: format,
            api_key: this.apiKey
        });

    // console.log('QueryString:', qs);

    qs.api_sig = this.getAPISig(qs);

    request.post({
        url: 'https://api.rememberthemilk.com/services/rest/',
        qs: qs
    }, function (err, response, body) {
        body = JSON.parse(body).rsp;

        if (body.stat === 'fail') {
            callback(new Error(body.err.msg), null);
        } else {
            callback(err, body);
        }
    });
};

RTMClient.prototype.makePrivRequest = function(method, options, callback) {
    return this.makeRequest(method, _.extend({}, options, {
        auth_token: this.token
    }), callback);
};

RTMClient.prototype.makeTimelineRequest = function(method, options, callback) {
    return this.makePrivRequest(method, _.extend({}, options, {
        timeline: this.timeline
    }), callback);
};

RTMClient.prototype.echo = function(options, callback) {
    this.makeRequest('rtm.test.echo', options, callback);
};

RTMClient.prototype.getFrob = function(callback) {
    this.makeRequest('rtm.auth.getFrob', {}, function (err, data) {
        if (err) {
            callback(err, null);
        } else {
            this.frob = data.frob;
            callback(null, data.frob);
        }
    }.bind(this));
};

RTMClient.prototype.getDesktopAuthURL = function(permissions, callback) {
    if (typeof permissions === 'function') {
        callback = permissions;
        permissions = 'write';
    }

    // TODO: Skip if we already have a frob?
    this.getFrob(function (err, frob) {
        if (err) {
            callback(err, null);
        } else {
            var options = {
                api_key: this.apiKey,
                perms: permissions,
                frob: frob
            };

            options.api_sig = this.getAPISig(options);

            callback(null, url.format({
                protocol: 'http',
                host: 'www.rememberthemilk.com',
                pathname: 'services/auth',
                query: options
            }));
        }
    }.bind(this));
};

RTMClient.prototype.getToken = function(frob, callback) {
    if (typeof frob === 'function') {
        callback = frob;
        frob = null;
    }

    this.makeRequest('rtm.auth.getToken', {
        frob: frob || this.frob
    }, function (err, data) {
        if (err) {
            callback(err, null);
        } else {
            // console.log('Token:', data);
            // if (data.stat === 'fail') {
            //     this.token = null;
            //     callback(new Error('Failed auth.'), null);
            // } else {
                this.token = data.auth.token;
                callback(null, this.token);
            // }
        }
    }.bind(this));
};

RTMClient.prototype.checkToken = function(token, callback) {
    if (typeof token === 'function') {
        callback = token;
        token = null;
    }

    this.makeRequest('rtm.auth.checkToken', {
        auth_token: token || this.token
    }, function (err, data) {
        if (err) {
            callback(err, null);
        } else {
            if (this.token == null) {
                this.token = data.auth.token;
            }

            callback(null, data.auth);
        }
    }.bind(this));
};

RTMClient.prototype.getLists = function(callback) {
    this.makePrivRequest('rtm.lists.getList', {}, function (err, data) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, data.lists.list);
        }
    });
};

RTMClient.prototype.createTimeline = function(callback) {
    this.makePrivRequest('rtm.timelines.create', {}, function (err, data) {
        if (err) {
            callback(err, null);
        } else {
            this.timeline = data.timeline;
            callback(null, data.timeline);
        }
    });
};

RTMClient.prototype.addTask = function(name, callback) {
    this.makeTimelineRequest('rtm.tasks.add', {
        name: name,
        parse: 1
    }, callback);
};

RTMClient.prototype.getTasks = function(callback) {
    this.makePrivRequest('rtm.tasks.getList', {}, function (err, data) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, data);
        }
    });
};

module.exports = RTMClient;
