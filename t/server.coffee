request = require 'supertest'
app     = require '../server.js'
assert  = require 'assert'
moment  = require 'moment'

r = request(app)

#########################################################
# Util

post = (payload, callback)->
    r.post("/x")
        .set('Content-Type', 'application/json')
        .send(payload)
        .end (err, res)->
            callback(err, res)

get = (path, callback)->
    r.get(path)
        .set('Content-Type', 'application/json')
        .end (err, res)->
            callback(err, res)

#########################################################

missingRoute = ->
    describe 'Missing route', ->

        paths = [
            '/'
            '/random'
            '/x'
            '/x/random'
        ]

        paths.forEach (path)->
            it "#{path} goes to 404", (done)->
                r.get(path).expect(404, done)


#########################################################

addItem = ->
    describe 'Put an item', ->
        #----------------------------------------------
        it 'returns 400 if content is missing', (done)->
            post {}, (err, res)->
                assert.equal(res.status, 400)
                done()

        #----------------------------------------------
        it 'returns 400 if there is no body', (done)->
            post { blah: 1 }, (err, res)->
                assert.equal(res.status, 400)
                done()

        #----------------------------------------------
        it 'returns 201 if there is body', (done)->
            post { body: "something" }, (err, res)->
                assert.equal(res.status, 201, "201 OK")
                assert.ok(res.body.id, "id present")
                done()

#########################################################

retrieveItems = ->
    describe 'Get an item', ->

        id = null

        before (done)->
            post { body: "something" }, (err, res)->
                id = res.body.id
                done()

        it "returns 404 if id not found", (done)->
            get "/x/562075c6850ddb4a24c9b005", (err, res)->
                assert.equal res.status, 404
                done()

        it "returns 200 if id is found", (done)->
            get "/x/#{id}", (err, res)->
                assert.equal res.status, 200
                done()

        it "returns the json stored", (done)->
            get "/x/#{id}", (err, res)->
                assert.equal res.body.body, "something"
                done()

        it "saves the correct data in the database", (done)->
            get "/x/#{id}", (err, res)->
                app.items.findOne { _id: app.ObjectId(id) }, (e, r)->
                    assert.equal r.body, "something"
                    done()

#########################################################

payloadTooLarge = ->
    describe "Large payload", ->

        largeMessage = ""
        for i in [0 .. 10001]
            largeMessage += "x"

        it "doesn't get saved",  (done)->
            post { body: largeMessage }, (err, res)->
                assert.equal res.status, 400
                done()

#########################################################

timeToLive = ->
    describe 'Expiration in the future', ->

        id = null

        before (done)->
            post { body: "something", timeToLive: 3600000 }, (err, res)->
                id = res.body.id
                done()

        it 'returns 200', (done)->
            get "/x/#{id}", (err, res)->
                assert.equal res.status, 200
                done()

        it "returns the correct id", (done)->
            get "/x/#{id}", (err, res)->
                assert.equal id, res.body._id
                done()

    describe 'Expiration in the past', ->

        id = null

        before (done)->
            post { body: "something", timeToLive: -1 }, (err, res)->
                id = res.body.id
                done()

        it 'returns 410', (done)->
            get "/x/#{id}", (err, res)->
                assert.equal res.status, 410
                done()

        it 'returns nothing', (done)->
            get "/x/#{id}", (err, res)->
                assert.deepEqual res.body, {}
                done()

#########################################################

describe 'Bootstrap', ->
    it 'Created a database', (done)->
        app.bootstrap ->
            assert.ok app.db

            # Cleanup
            app.items.remove({})

            # Tests
            missingRoute()
            addItem()
            retrieveItems()
            timeToLive()
            payloadTooLarge()

            done()
