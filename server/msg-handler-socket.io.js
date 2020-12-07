const debug = require('debug')('msg-handler')

const rooms = ['기본방1', '기본방2']
const messageByRoom = {
  ['room']: [] // msg by room
}

const {
  LOGIN,
  EVENT_MESSAGE_UPDATE,
  EVENT_ROOM_LEAVE,
  USER_LIST,
  ROOM_LIST,
  EVENT_ROOM_UPDATE,
  ROOM_JOIN,
  EVENT_ROOM_JOIN
} = require('./message')

const isAuthenticated = userName = true

const getUserName = socket => socket.$userName
const getRoomName = socket => socket.$roomName

module.exports = io => socket => {
  return {
    login(userName) {
      socket.$userName = userName
      socket.emit(LOGIN, rooms)
    },
    disconnect(reason) {
      const roomName = getUserName(socket)
      const userName = getRoomName(socket)
      socket.leave(roomName)
      io.in(roomName).emit(EVENT_ROOM_LEAVE, {
        roomName,
        userName: 'Bot',
        text: `${userName}, leave ${roomName}`
      })
    },
    async getUsers(roomName) {
      const room = io.sockets.adapter.rooms.get(roomName)
      const users = [...io.in(room).sockets.sockets.values()]
        .filter(socket => socket.rooms.has(roomName) && getUserName(socket))
        .map(getUserName)
      debug(`${roomName}: [${users}]`)
      socket.emit(USER_LIST, users)
    },
    getRooms() {
      socket.emit(ROOM_LIST, rooms)
    },
    createRoom(roomName) {
      rooms.push(roomName)
      io.of('/').emit(EVENT_ROOM_UPDATE, rooms)
    },
    deleteRoom(roomName) {
      const roomIndex = rooms.findIndex(room => room === roomName)
      if(roomIndex >= 0) {
        rooms.splice(roomIndex, 1)
      }
      io.of('/').emit(EVENT_ROOM_UPDATE, rooms)
    },
    joinRoom(roomName) {
      socket.leave(socket.$roomName)
      debug('leave ', socket.$roomName)
      socket.join(roomName)
      debug('join ', roomName)
      socket.$roomName = roomName
      // debug('join', roomName)
      socket.emit(ROOM_JOIN, messageByRoom[roomName] || [])
      io.in(roomName).emit(EVENT_ROOM_JOIN, {
        roomName,
        userName: 'Bot',
        targetUserName: socket.$userName,
        text: `${socket.$userName}, joined ${roomName}`,
      })
    },
    leaveRoom(roomName) {
      console.log('leave ', roomName)
      socket.leave(roomName)
      io.in(roomName).emit(EVENT_ROOM_LEAVE, {
        roomName,
        userName: 'Bot',
        text: `${socket.$userName}, leave ${roomName}`
      })
    },
    sendMessage(messageObj) {
      io.to(messageObj.roomName).emit(EVENT_MESSAGE_UPDATE, {
        userName: messageObj.userName,
        text: messageObj.text
      })

      const msgs = messageByRoom[messageObj.roomName] || []
      msgs.push({
        userName: messageObj.userName,
        text: messageObj.text
      })
      messageByRoom[messageObj.roomName] = msgs
    },
  }
}
