
// Mongo
import mongodb = require('mongodb');

export var mdb: mongodb.Db;

export interface Item {
    _id?: string;
    ip?: string;
    extVersion?: string;
    host?: string;
    createdDate?: Date;
    timeToLive?: number;
    body: string;
}

export interface Message extends Item {
    fingerprints?: Array<string>;
}

export interface Key extends Item {
}

export function connect(url: string, callback: (error: Error) => void) {
    mongodb.MongoClient.connect(url, function(error, _db) {
        if (error) {
            callback(error);
            return;
        }
        mdb = _db;
        callback(null);
    })
}

function getItem(cname: string, id: string, callback: (error: Error, item: Item) => void) {
    var objId: mongodb.ObjectID;

    try {
        objId = new mongodb.ObjectID(id);
    } catch (error) {
        callback(null, null);
        return;
    }

    mdb.collection(cname, function(error, collection) {
        if (error) {
            callback(error, null);
            return;
        }
        collection.findOne({_id: objId}, function(error, item) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, item);
        })
    })
}

function addItem(cname: string, item: Item, callback: (error: Error, _item: Item) => void) {
    mdb.collection(cname, function(error, collection) {
        if (error) {
            callback(error, null);
            return;
        }
        collection.insertOne(item, function(error, _item) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, _item);
        })
    })
}

export function getMessage(id: string, callback: (error: Error, message: Message) => void) {
    getItem('messages', id, callback);
}

export function getKey(id: string, callback: (error: Error, key: Key) => void) {
    getItem('keys', id, callback);
}

export function addMessage(message: Message, callback: (error: Error, _m: Message) => void) {
    addItem('messages', message, callback);
}

export function addKey(key: Key, callback: (error: Error, _k: Key) => void) {
    addItem('keys', key, callback);
}
