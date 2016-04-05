/// <reference path="typings/tsd.d.ts" />

import * as mongodb from "mongodb";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as log4js from "log4js";
import * as db from "./db";
import config = require("config");

var url = <string>config.get('mongo.url'),
    port = <number>config.get('express.port');

// Logger
log4js.configure({
    appenders: <log4js.AppenderConfig[]>(config.get('log4js.appenders'))
})
var logger = log4js.getLogger('app');
logger.setLevel(<string>config.get('log4js.level'));

// App
var routes = express();

routes.use(bodyParser.json());
routes.use((req, res, next) => {
    logger.info(req.method + " " + req.path);
    next();
});

// Template
//=================================================================
function view(data) {
    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Short Link Privacy Message</title>
        <style type="text/css">
            body { font-family: sans-serif; background-color: #fff; }
            #content { width: 500px; margin-left: auto; margin-right: auto; }
            .slp {}
            .slp a { color: #00f; font-weight: bold; }
            pre { background-color: #eee; padding: 10px; border: 1px dotted #aaa; overflow-y: auto; }
            #decrypt { text-decoration: none; border-bottom: 1px dotted blue; font-size: .8em; }
        </style>
      </head>
      <body>
        <div id="content">
            <h1>PGP Encrypted Message</h1>
            <p class="slp">
                Please install the <a href="https://chrome.google.com/webstore/detail/short-link-privacy/kkhoekeemmabphdemkfakkjjmpfkjocm">Short Link Privacy</a> browser
                plugin to have this message decrypt in your browser.
            </p>
            <div> <a id="decrypt" href="#">decrypt here</a> </div>
            <pre id="msg">
            ` + data.body + `
            </pre>
            <small class="footer">
                <a href="https://en.wikipedia.org/wiki/Pretty_Good_Privacy">What is PGP?</a> |
                <a href="/">What is SLP?</a>
            </small>
        </div>
        <script>
           document.getElementById('decrypt').addEventListener('click', function(e) {
            e.preventDefault();
            var el = document.createElement('pre');
            el.innerText = location.href;
            this.parentElement.appendChild(el);
            this.parentElement.removeChild(this);
           });

          (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
          })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

          ga('create', 'UA-74656221-2', 'auto');
          ga('send', 'pageview');

        </script>
      </body>
    </html>
    `;
}

routes.get("/:realm/:id", (req, res) => {
    var realm: string = req.params.realm,
        id: string = req.params.id,
        get: (id: string, callback: (error: Error, i: db.Item) => void) => void;

    logger.trace("headers: ", req.headers);
    logger.trace("body: ", req.body);

    if ( realm == 'm' ) {
        get = db.getMessage;
    } else if ( realm == 'k' ) {
        get = db.getKey;
    } else {
        res.sendStatus(404);
        return;
    }

    get(id, (error, item) => {
        if (error) {
            logger.error(error.toString());
            res.sendStatus(500);
        } else if (!item) {
            res.sendStatus(404);
        } else {

            // Does the message expire?
            if (item.timeToLive) {
                var now = new Date();
                var createdDate = item.createdDate;
                if (createdDate.getTime() + item.timeToLive < now.getTime()) {
                    res.statusCode = 410;
                    res.send("Expired");
                    return;
                }
            }

            // Serve content
            if (req.get('Content-Type') == "application/json") {
                res.statusCode = 200;
                res.json(item);
            } else {
                res.statusCode = 200;
                res.send(view(item));
            }
        }
    })
});

routes.post("/:realm", (req, res) => {
    var item: db.Item = req.body,
        realm: string,
        add: (key: db.Key, callback: (error: Error, _k: db.Key) => void) => void;

    realm = req.params.realm;

    logger.trace("headers: ", req.headers);
    logger.trace("body: ", req.body);

    if ( realm == 'm' ) {
        add = db.addMessage;
    } else if ( realm == 'k' ) {
        add = db.addKey;
    } else {
        res.sendStatus(404);
        return;
    }

    var err400 = function(msg: string) {
        res.statusCode = 400;
        res.json({ error: msg });
    }

    if (!item) {
        err400("no payload");
        return;
    }

    if (!item.body) {
        err400("body is required");
        return;
    }

    if (item.body.length > config.get('maxMessageLen')) {
        err400("body is too long");
        return;
    }

    item.ip = req.header('x-real-ip');
    item.createdDate = new Date();

    add(item, (error, m) => {
       if (error) {
           logger.error(error.toString());
           res.sendStatus(500);
       } else {
           res.statusCode = 201;
           res.json({ id: m["insertedId"] });
       }
    })
})

export function run(callback?: () => void) {
    db.connect(url, (error) => {
        if ( error ) {
            logger.error(error.toString());
            return;
        }
        routes.listen(port, callback);
    })
}

export var props = {
    config: config,
    logger: logger,
    db: db,
    routes: routes
}
