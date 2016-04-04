/// <reference path="../typings/tsd.d.ts" />

import * as request from "supertest";
import * as assert from "assert";
import * as mocha from "mocha";
import * as app from "../application";
import * as db from "../db";

var p = app.props;

var r = request(p.routes);

function post(url, payload, callback) {
    r.post(url)
     .set('Content-Type', 'application/json')
     .send(payload)
     .end(function(err, res) {
         callback(err, res);
    });
};

function get(path, callback) {
    r.get(path)
     .set('Content-Type', 'application/json')
     .end(function(err, res) {
      callback(err, res);
    });
};

//======================================================

function missingRoute() {
    describe('Missing route', () => {
      var paths;
      paths = ['/', '/random', '/x', '/m/random', '/m', '/k'];
      paths.forEach((path) => {
        it(path + " goes to 404", function(done) {
          r.get(path).expect(404, done);
        });
      });
    });
}

//======================================================

function malformedRequest() {
    describe('Malformed request', () => {
        it("returns 400 if content is missing", (done) => {
            post("/m", {}, (err, res) => {
                assert.equal(res.status, 400)
                done()
            })
        })

        it("returns 400 if there is no body", (done) => {
            post("/k", { blah: 1 }, (err, res) => {
                assert.equal(res.status, 400)
                done()
            })
        })

        it("returns 400 if the message was too big", (done) => {
            var big = 'x'["repeat"](<number>p.config.get("maxMessageLen") + 1);
            post("/k", { body: big }, (err, res) => {
                assert.equal(res.status, 400)
                done()
            })
        })
    })
}

//======================================================

function addMessage() {
    describe('Add message', () => {
        var error: Error,
            res: any,
            message: db.Message = {
                body: "test",
                fingerprints: ["aa", "bb"]
            };

        before((done) => {
            p.db.mdb.collection('messages').remove({}, () => {
                post("/m", message, (e, r) => { 
                    error = e;
                    res = r;
                    done();
                })
            })
        });

        it ("does not produce an error", () => {
            assert.equal(error, null);
        })

        it ("returns 201", () => {
            assert.equal(res.status, 201);
        })

        it ("returns a document with id", () => {
            assert.ok(res.body.id)
        })

        it ("returns the correctly insterted document id", (done) => {
            p.db.getMessage(res.body.id, (err, m) => {
                assert.equal(m.body, message.body);
                done();
            })
        })

    })
}

function addKey() {
    describe('Add key', () => {
        var error: Error,
            res: any,
            key: db.Key = { body: "test" };

        before((done) => {
            p.db.mdb.collection('keys').remove({}, () => {
                post("/k", key, (e, r) => { 
                    error = e;
                    res = r;
                    done();
                })
            })
        });

        it ("does not produce an error", () => {
            assert.equal(error, null);
        })

        it ("returns 201", () => {
            assert.equal(res.status, 201);
        })

        it ("returns a document with id", () => {
            assert.ok(res.body.id)
        })

        it ("returns the correctly inserted document id", (done) => {
            p.db.getKey(res.body.id, (err, m) => {
                assert.equal(m.body, key.body);
                done();
            })
        })

    })
}

function addExpiringMessage() {

    var id, res;

    var expFunc = function(ttl: number, done) {
        post("/m", {body: "something", timeToLive: ttl}, (err, r)=>{
            id = r.body.id;
            get("/m/" + id, (e, r) => {
                res = r;
                done();
            })
        })
    };

    describe('Expiration in the future', ()=>{

        before((done) => {
            expFunc(3600000, done)
        });

        it("returns 200", () => {
            assert.equal(res.status, 200);
        });

        it ("returns the correct id", () => {
            assert.equal(id, res.body._id);
        });
    });

    describe('Expiration in the past', ()=>{

        before((done) => {
            expFunc(-1, done)
        });

        it("returns 410", () => {
            assert.equal(res.status, 410);
        });

        it ("returns nothing", () => {
            assert.deepEqual(res.body, {});
        });
    });
}

function getMessage() {
    var message: db.Message,
        res,
        id;

    var pg = function(m: db.Message, done) {
        post("/m", m, (err, r)=>{
            id = r.body.id;
            get("/m/" + id, (e, r) => {
                res = r;
                message = r.body;
                done();
            })
        })
    };

    describe('Get message', () => {

        before((done) => {
            pg({ body: "test", fingerprints:[] }, done)
        })

        it("returns 200", () => {
            assert.equal(res.status, 200);
        })

        it("returns the json stored", () => {
            assert.equal(message.body, "test")
        })

        it("saves the correct data in the DB", () => {
            assert.equal(id, message._id);
        })
    })
}

function getKey() {
    var key: db.Key,
        res,
        id;

    var pg = function(m: db.Key, done) {
        post("/k", m, (err, r)=>{
            id = r.body.id;
            get("/k/" + id, (e, r) => {
                res = r;
                key = r.body;
                done();
            })
        })
    };

    describe('Get key', () => {

        before((done) => {
            pg({ body: "test" }, done)
        })

        it("returns 200", () => {
            assert.equal(res.status, 200);
        })

        it("returns the json stored", () => {
            assert.equal(key.body, "test")
        })

        it("saves the correct data in the DB", () => {
            assert.equal(id, key._id);
        })
    })
}

describe('Application', () => {
    before((done) => {
        app.run(done);
    });

    it ("has config", () => {
        assert.ok(p.config);
    })

    it ("has db", () => {
        assert.ok(p.db);
    })

    it ("has logger", () => {
        assert.ok(p.logger);
    })

    missingRoute();
    malformedRequest();
    addMessage();
    addKey();
    addExpiringMessage();
    getMessage();
    getKey();
});
