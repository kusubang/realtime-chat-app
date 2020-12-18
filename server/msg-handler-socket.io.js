
//
//  SOCKET MESSAGE HANDLER

//  ██╗░░██╗░█████╗░███╗░░██╗██████╗░██╗░░░░░███████╗██████╗░
//  ██║░░██║██╔══██╗████╗░██║██╔══██╗██║░░░░░██╔════╝██╔══██╗
//  ███████║███████║██╔██╗██║██║░░██║██║░░░░░█████╗░░██████╔╝
//  ██╔══██║██╔══██║██║╚████║██║░░██║██║░░░░░██╔══╝░░██╔══██╗
//  ██║░░██║██║░░██║██║░╚███║██████╔╝███████╗███████╗██║░░██║
//  ╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═════╝░╚══════╝╚══════╝╚═╝░░╚═╝

const debug = require('debug')('chat:msg-handler')

const MESSAGE = require('./message')

const getUserName = socket => socket.$userName
const getRoomName = socket => socket.$roomName

module.exports = (io, stores) => socket => {

  const {
    chatStore,
    roomStore,
    userStore
  } = stores

  const ns = io.of('/')
  const adapter = ns.adapter

  const utils = {
    async getUserNamesIn(roomName) {
      const sockets = await adapter.sockets([roomName]);
      const userNameBySocketId = await userStore.get()
      const userNames = Object.entries(userNameBySocketId)
        .filter(([name, sid]) => sockets.has(sid))
        .map(([name, sid]) => name)
      return userNames
    },
    async getUserNames() {
      const sockets = await adapter.sockets([]);
      const userNameBySocketId = await userStore.get()
      const userNames = Object.entries(userNameBySocketId)
        .filter(([name, sid]) => sockets.has(sid))
        .map(([name, sid]) => name)
      return userNames
    }
  }

  const handler = {
    async login(userName, callback) {
      socket.$userName = userName
      debug(`[login] ${userName}(${socket.id})`,)
      const currentUsers = await utils.getUserNames()
      if(currentUsers.includes(userName)) {
        callback('user already exists', [])
        return
      }
      // console.log('current users:', currentUsers)
      // const currentUsers = await getUserNames()
      await userStore.set(userName, socket.id)

      const rooms = await roomStore.get()
      callback(null, rooms)
    },
    async disconnect(reason) {
      const roomName = getRoomName(socket)
      const userName = getUserName(socket)
      socket.leave(roomName)
      io.in(roomName).emit(MESSAGE.EVENT_ROOM_LEAVE, {
        roomName,
        userName: 'Bot',
        messagePayload: `${userName} is disconnected - ${reason}`
      })

      if(userName) {
        console.log('delete user:', userName)
        userStore.delete(userName)
      }
    },
    async getUsers(roomName = '', callback) {
      const userNames = await utils.getUserNamesIn(roomName)
      callback(userNames)
    },
    async getRooms(callback) {
      const rooms = await roomStore.get()
      callback(rooms)
    },
    async createRoom(roomName) {
      await roomStore.add(roomName)
      const rooms = await roomStore.get()
      ns.emit(EVENT_ROOM_UPDATE, rooms)
    },
    async deleteRoom(roomName) {
      await roomStore.delete(roomName)
      const rooms = await roomStore.get()
      ns.emit(EVENT_ROOM_UPDATE, rooms)
    },
    async joinRoom(roomName, callback) {
      const userName = socket.$userName
      socket.join(roomName)
      debug(`[join] ${userName} to ${roomName}`)
      socket.$roomName = roomName

      const conversation = await chatStore.get(roomName)
      callback(conversation)

      io.in(roomName).emit(MESSAGE.EVENT_ROOM_JOIN, {
        roomName,
        userName: 'Bot',
        targetUserName: socket.$userName,
        messagePayload: `${socket.$userName}, joined ${roomName}`,
      })
    },
    async leaveRoom(roomName) {
      debug(`[leave] leave ${socket.$userName} from ${roomName}`)
      socket.leave(roomName)
      io.in(roomName).emit(MESSAGE.EVENT_ROOM_LEAVE, {
        roomName,
        userName: 'Bot',
        messagePayload: `${socket.$userName}, leave ${roomName}`
      })
    },
    async sendMessage(messageObj) {
      io.to(messageObj.roomName).emit(MESSAGE.EVENT_MESSAGE_UPDATE, {
        userName: messageObj.userName,
        messagePayload: messageObj.messagePayload
      })
      await chatStore.post(messageObj)
    },
    async getConversation(obj, callback) {
      console.log('get conversation')
      const msgs = await chatStore.get(obj.roomName, obj.options)
      socket.emit(MESSAGE.CONVERSATION_GET, msgs)

      callback(msgs)
    },
  }

  socket.on(MESSAGE.LOGIN, handler.login)
  socket.on(MESSAGE.USER_LIST, handler.getUsers)
  socket.on(MESSAGE.ROOM_LIST, handler.getRooms)
  socket.on(MESSAGE.ROOM_CREATE, handler.createRoom)
  socket.on(MESSAGE.ROOM_DELETE, handler.deleteRoom)
  socket.on(MESSAGE.ROOM_JOIN, handler.joinRoom)
  socket.on(MESSAGE.ROOM_LEAVE, handler.leaveRoom)
  socket.on(MESSAGE.MESSAGE_SEND, handler.sendMessage);
  socket.on(MESSAGE.CONVERSATION_GET, handler.getConversation);
  socket.on(MESSAGE.DISCONNECT, handler.disconnect);
}
