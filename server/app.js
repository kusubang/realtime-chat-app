
//    Realtime Chat Application Prototype
//
//    █▀▀ █░█ ▄▀█ ▀█▀   ▄▀█ █▀█ █▀█
//    █▄▄ █▀█ █▀█ ░█░   █▀█ █▀▀ █▀▀
//
const debug = require('debug')('chat:server')
const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const redisAdapter = require('socket.io-redis');
const redis = require('async-redis')

const makeMsgHandler = require('./msg-handler-socket.io')
require('./config/mongo.js')

const ChatStoreMongo = require('./store/chat-store-mongo')
const RoomStore = require('./store/room-store')
const UserStore = require('./store/user-store')



const app = express();
const server = http.createServer(app);

const options = { transports: [ 'websocket' ] };
const redisClient = redis.createClient()
const io = socketIO(server, options);

io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

app.use('/', express.static(__dirname + '/public'));

const stores = {
  chatStore: ChatStoreMongo(),
  roomStore: RoomStore(redisClient),
  userStore: UserStore(redisClient)
}
io.on('connection', makeMsgHandler(io, stores))

const port = process.env['PORT'] || 3000

debug('listen:', port)

server.listen(port);
