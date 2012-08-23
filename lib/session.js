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
    var self = this;

    if (self.timeline == null) {
        self.createTimeline(function (err, timeline) {
            if (err) {
                callback(err, null);
                return;
            }

            self.timeline = timeline.timeline;
            self.makeTimelineRequest(method, options, callback);
        });
        return;
    }

    return self.client.makeTimelineRequest(method, self.token, self.timeline, options, callback);
};

RTMSession.prototype.login = function(callback) {
    if (this.token == null) {
        this.authenticate(callback);
        return;
    }

    this.client.checkToken(this.token, callback);
};

RTMSession.prototype.authenticate = function(callback) {
    var self = this;

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    self.client.getFrob(function (err, frob) {
        self.client.getDesktopAuthURL(frob, 'delete', function (err, url) {
            if (err) {
                callback(err, null);
            }

            console.log('Once you have granted this application access to Remember the Milk, press any key to continue.');
            open(url);

            process.stdin.once('data', function (chunk) {
                process.stdin.pause();
                self.client.getToken(frob, function (err, token) {
                    if (err) {
                        callback(err, null);
                    }

                    self.token = token;
                    self.login(callback);
                });
            });
        });
    });
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

RTMSession.prototype.getLists = function(callback) {
    this.makePrivRequest('rtm.lists.getList', {}, function (err, data) {
        callback(err, data ? data.lists.list.filter(function (list) {
            return list.archived === '0' && list.deleted === '0';
        }) : null);
    });
};

module.exports = RTMSession;
