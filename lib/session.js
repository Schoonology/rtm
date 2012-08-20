var RTMClient = require(__dirname + '/client'),
    open = require('open');

// TODO: Check validity of callback functions before using.

function RTMSession(options) {
    if (options == null) {
        options = {};
    }

    this.client = this.client || options.client || new RTMClient({
        apiKey: options.apiKey,
        secret: options.secret
    });

    this.token = this.token || options.token || null;
    this.timeline = this.timeline || options.timeline || null;
    this.frob = null;

    console.log('Options:', options);
}

RTMSession.prototype.makePrivRequest = function(method, options, callback) {
    return this.client.makePrivRequest(method, this.token, options, callback);
};

RTMSession.prototype.makeTimelineRequest = function(method, options, callback) {
    if (this.timeline == null) {
        this.createTimeline(function (err, timeline) {
            if (err) {
                callback(err, null);
                return;
            }

            this.timeline = timeline.timeline;
            this.makeTimelineRequest(method, options, callback);
        }.bind(this));
        return;
    }

    return this.client.makeTimelineRequest(method, this.token, this.timeline, options, callback);
};

RTMSession.prototype.login = function(callback) {
    if (this.token == null) {
        this.authenticate(callback);
        return;
    }

    this.client.checkToken(this.token, callback);
};

RTMSession.prototype.authenticate = function(callback) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    this.client.getFrob(function (err, frob) {
        this.client.getDesktopAuthURL(frob, 'delete', function (err, url) {
            if (err) {
                callback(err, null);
            }

            console.log('Once you have granted this application access to Remember the Milk, press any key to continue.');
            open(url);

            process.stdin.once('data', function (chunk) {
                process.stdin.pause();
                this.client.getToken(frob, function (err, token) {
                    if (err) {
                        callback(err, null);
                    }

                    this.token = token;
                    this.login(callback);
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

RTMSession.prototype.createTimeline = function(callback) {
    this.makePrivRequest('rtm.timelines.create', {}, callback);
};

RTMSession.prototype.undo = function(transactionID, callback) {
    this.makeTimelineRequest('rtm.transactions.undo', {
        transaction_id: transactionID
    }, callback);
};

RTMSession.prototype.addTask = function(name, callback) {
    this.makeTimelineRequest('rtm.tasks.add', {
        name: name,
        parse: 1
    }, function (err, data) {
        callback(err, data ? data.transaction.id : null);
    });
};

module.exports = RTMSession;
