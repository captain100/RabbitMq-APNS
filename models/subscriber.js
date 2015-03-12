
var mongodbPool = require('./db');
var ObjectID = require('mongodb').ObjectID;


exports.getSubscriberbyStarId = function(starId,callback){
        mongodbPool.acquire(function (err,db){
            if(err){
                return callback(err);
            }
            db.collection('subscriber',function(err,collection){
                if(err){
                    mongodbPool.release(db);
                    return callback(err);
                }
                collection.find({'starId':starId}).toArray(function(err,docs){
                    mongodbPool.release(db);
                    if(err){
                        return callback(err);
                    }else{
                        console.log("---------------subscriber---------"+docs);
                        return callback(null,docs);
                    }
                });
            });
        });
};