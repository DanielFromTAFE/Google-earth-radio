/**
 * Created by waimingchoi on 18/5/17.
 */

// Modules
var ProtoBuf = require("protobufjs");
var fs = require('fs');
var dgram = require("dgram");
var lastGESyncString = '';
var CONFIG = require('./node-config.js');
var CesiumSync = ProtoBuf.loadProtoFile("cesiumsync.proto").build("CesiumSync");
var url = require('url');
var io = require('socket.io');
var express = require('express'),
    app = express()
    , http = require('http')
    , server = http.createServer(app);
//create a udp connection

var UDPserver = dgram.createSocket("udp4");
//create a server, listening on port 1333
app.get('/',function (req,res,next) {
    res.writeHead(200,{'Content-Type': 'text/html'});
    fs.createReadStream(__dirname + '/radioControl.htm').pipe(res);
    console.log('connected to server: port 1333');
    next();
});
app.use('/public',express.static('public'));

// app.get('/public/javascript/script.js',function (req,res) {
//    res.sendFile(__dirname + '/public/javascript/script.js');
// });
server.listen(CONFIG.NODE_SERVER_PORT);


var server_io = io.listen(server);
server_io.sockets.on('connection',function (socket) {
    setInterval(function () {
        //send message to web browser every half second
        socket.emit('message',{'message': lastGESyncString});
    },500);
});


//UDP server events
UDPserver.on("listening", function(err) {
    var address = UDPserver.address();
    console.log("server listening " + address.address + ":" + address.port);
    if (err) {
        console.log(err);
        return;
    }
});

UDPserver.on("message", function(message, remote) {
    //split the string by ,
    var viewsync = String(message).split(',');
    var s = new CesiumSync();
    s.msgtype = 2;
    s.lat = parseFloat(viewsync[1]);
    s.lon = parseFloat(viewsync[2]);
    var syncString = s.lat+','+s.lon;
    //update the latest string
    if (syncString != lastGESyncString) {
        //when the map is moving, update the string
        lastGESyncString = syncString;
    }

});

UDPserver.on("error", function(err) {
    console.log(err);
    UDPserver.close();
});


UDPserver.on("close", function() {
    console.log("closed.");
});

UDPserver.bind(CONFIG.UDP_PORT, CONFIG.UDP_HOST);
