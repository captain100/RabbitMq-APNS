var apns = require("apn");
var Subscriber = require("./models/subscriber.js");
var User = require("./models/users.js");
var settings = require("./settings.js");
var fs = require('fs');
var pushLogfile = fs.createWriteStream('push.log',{flags:'a'});

var _log = function(msg) {
    console.log(msg);
};

var amqp = require('amqp');

var connection = amqp.createConnection({ host: settings.rabbitmq,
					 port: settings.rabbitmqPort,
					 login: settings.rabbitmqUser,
					 passsword: settings.rabbitmqPassword });

connection.on('ready',function(){
    console.log('connect to the APNS Queue');
    connection.exchange(settings.exchange, {type: 'direct',autoDelete: false,confirm: true}, function(exchange){
        connection.queue(settings.queue, {exclusive: false}, function(queue){
            queue.bind(settings.exchange, settings.routingKey);
            queue.subscribe(function(msg){
                var encoded_payload = unescape(msg.data);
                var payload = JSON.parse(encoded_payload); //JSON dict
                var starId = payload.starId;
                var message = payload.message;
                var conditions = 0;
                var content = payload.content;
	            var noticeType = payload.noticeType;
                var badge = parseInt(payload.badge,10) || 0;
                console.log('content = '+content.messagePhotoId);
                doPushMessage(starId, message,conditions,content,noticeType, badge, function(err) {

                    if (err) {
                        var meta = '['+ new Date() +']' + starId + '\n';  
                        pushLogfile.write(meta + err +'\n');
                    }
                });
            });
        });
    });
});

var doPushMessage = function(starId, message,conditions,content,noticeType, badge, callback){
    getSubscribersbystarId(starId, function(err,devices){
        if(err){
            return callback(err);
        }
        if(devices){
            var connectionOptions = {
            "cert": "certs/cert.pem",
            "key": "certs/key.pem",
            "gateway": "gateway.sandbox.push.apple.com"
            /* legacy: true */
            };
            var apnsConnection = new apns.Connection(connectionOptions);
            /*
            apnsConnection.on("connected", function(openSockets) {
                          _log("connected to apns!");
                        });

            apnsConnection.on("disconnected", function(openSockets) {
                          _log("disconnected from apns!");
                        });

            apnsConnection.on("transmitted", function(note, device) {
                          _log("sent note to device: " + device);
                        });
            */
            apnsConnection.on("error", function(err) {
                          pushLogfile.write("apns connection error: " + err + '\n');
                        });

            apnsConnection.on("socketError", function(err) {
                          pushLogfile.write("socket error: " + err + '\n');
                        });
            var tokenHashTable = {};
            for (var i in devices) {
                var device = devices[i];

                var deviceToken = device.deviceToken;
                var user_id = device.userId;
                var star_id = device.starId;
                validateUserid(deviceToken,star_id,user_id,conditions,function(date){
                    if(date == null){
                        console.log("Can't push apns");

                    }else{
                        if (validateDeviceToken(date,tokenHashTable)) {
                            console.log("----------this----pass------------------");
                            var apnsDevice = new apns.Device(date);

                            var note = new apns.Notification();
                            note.badge = badge;
                            note.alert = message;
                            note.sound = "ping.aiff";

                            note.payload = {'type':noticeType,'content':content};

                            apnsConnection.pushNotification(note, apnsDevice);


                            pushLogfile.write("sending note to deviceToken: " + date + '\n');
                        }
                    }
                });
            }

            apnsConnection.shutdown();
            callback(null);
        }else{
            callback(null);
        }
    });
};

var validateDeviceToken = function(token,tokenHashTable) {
    if (token.length < 64) {
        return false;
    }
    if(tokenHashTable[token] === undefined){
        tokenHashTable[token] = 1;
        return true;
    }else{
        return false;
    }
};

var getSubscribersbystarId = function(starId, callback) {

    Subscriber.getSubscriberbyStarId(starId,function(err,devices){
        if(err){
            return callback(err);
        }else if(devices){
            return callback(null,devices);
        }else{
            return callback(null,null);
        }
    });
};
var  validateUserid = function(deviceToken,star_id,user_id,conditions,callback){
    if(conditions == 0){
        return callback(deviceToken);
    }else {
     User.getUserRaleaseValue(user_id, function (err, user) {
            if (err) {

                return callback(null);
            }
            if (user) {
                for (var i in user.user.starInfo) {

                    console.log("user.user.starInfo [" + i + "] = " + user.user.starInfo[i].starId);


                    if (user.user.starInfo[i].starId == star_id) {

                        if (user.user.starInfo[i].relationValue >= conditions) {
                            console.log("制定的明星" + user.user.starInfo[i].relationValue + "    " + conditions);
                            return callback(deviceToken);
                        } else {
                            return callback(null);
                        }


                    }

                }

            }


        });
    }


};
