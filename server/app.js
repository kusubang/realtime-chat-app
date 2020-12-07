
//    Realtime Chat Application Prototype
//


const debug = require('debug')('server')

const express = require('express')
const app = express();

const server = require('http').createServer(app);

const makeMsgHandler = require('./msg-handler-socket.io')

const {
  LOGIN,
  USER_LIST,
  ROOM_CREATE,
  ROOM_DELETE,
  ROOM_LIST,
  ROOM_JOIN,
  ROOM_LEAVE,
  MESSAGE_SEND,
  DISCONNECT
} = require('./message')

const options = { /* ... */ };

const io = require('socket.io')(server, options);

app.use('/', express.static(__dirname + '/public'));

io.on('connection', socket => {
  const handler = makeMsgHandler(io)(socket)
  socket.on(LOGIN, handler.login)
  socket.on(USER_LIST, handler.getUsers)
  socket.on(ROOM_LIST, handler.getRooms)
  socket.on(ROOM_CREATE, handler.createRoom)
  socket.on(ROOM_DELETE, handler.deleteRoom)
  socket.on(ROOM_JOIN, handler.joinRoom)
  socket.on(ROOM_LEAVE, handler.leaveRoom)
  socket.on(MESSAGE_SEND, handler.sendMessage);
  socket.on(DISCONNECT, handler.disconnect);
})

server.listen(3000);
