/**
 * Created by user on 15-1-21.
 */
var mongodbPool = require('./db');
var ObjectID = require('mongodb').ObjectID;



exports.getUserRaleaseValue = function(user_id,callback){
    mongodbPool.acquire(function(err,db){
        if(err){
            callback(err);
        }
        db.collection('users',function(err,collection){
            if(err){
                mongodbPool.release(db);
                return callback(err);
            }
            collection.findOne({"_id":new ObjectID(user_id)},function(err,user){
                mongodbPool.release(db);
                if(err){
                    return callback(err,null);
                }
                console.log("--------user--------"+user);
                return callback(null,user);

            });
        });
    });
};