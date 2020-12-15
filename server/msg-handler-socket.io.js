const debug = require('debug')('chat:msg-handler')
const redis = require('async-redis')

const redisClient = redis.createClient()

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


const ChatStoreMongo = require('./store/chat-store-mongo')
const RoomStore = require('./store/room-store')

const chatStore = ChatStoreMongo()
const roomStore = RoomStore(redisClient)

const getUserName = socket => socket.$userName
const getRoomName = socket => socket.$roomName

module.exports = io => socket => {

  const ns = io.of('/')

  return {
    async login(userName) {
      socket.$userName = userName
      socket.emit(LOGIN, await roomStore.get())
      debug(`[login] ${userName}(${socket.id})`,)
      await redisClient.hmset('sockets', {[userName]: socket.id})
    },
    async disconnect(reason) {
      const roomName = getRoomName(socket)
      const userName = getUserName(socket)
      socket.leave(roomName)
      io.in(roomName).emit(EVENT_ROOM_LEAVE, {
        roomName,
        userName: 'Bot',
        messagePayload: `${userName}, leave ${roomName}`
      })

      if(userName) {
        await redisClient.hdel('sockets', userName)
        debug('delete', socket.$userName)
      }
    },
    async getUsers(roomName) {
      const sockets = await ns.adapter.sockets([roomName]);
      const re = await redisClient.hgetall('sockets');
      const x = Object.entries(re).filter(([name, sid]) => sockets.has(sid))
      socket.emit(USER_LIST, x.map(arr => arr[0]))

    },
    async getRooms() {
      socket.emit(ROOM_LIST, rooms)
    },
    async createRoom(roomName) {
      await roomStore.add(roomName)
      const rooms = await roomStore.get()
      ns.emit(EVENT_ROOM_UPDATE, rooms)
    },
    async deleteRoom(roomName) {
      await redisClient.srem("rooms", roomName);
      const rooms = await redisClient.smembers('rooms')
      io.of('/').emit(EVENT_ROOM_UPDATE, rooms)
    },
    async joinRoom(roomName) {
      debug(`[join] ${socket.$userName} to ${roomName}`)
      socket.leave(socket.$roomName)
      await ns.adapter.remoteLeave(socket.id, roomName);
      socket.join(roomName)
      await ns.adapter.remoteJoin(socket.id, roomName);

      socket.$roomName = roomName

      const msg = await chatStore.get(roomName)
      socket.emit(ROOM_JOIN, msg)

      io.in(roomName).emit(EVENT_ROOM_JOIN, {
        roomName,
        userName: 'Bot',
        targetUserName: socket.$userName,
        messagePayload: `${socket.$userName}, joined ${roomName}`,
      })
    },
    async leaveRoom(roomName) {
      debug(`[leave] leave ${socket.$userName} from ${roomName}`)
      socket.leave(roomName)
      io.in(roomName).emit(EVENT_ROOM_LEAVE, {
        roomName,
        userName: 'Bot',
        messagePayload: `${socket.$userName}, leave ${roomName}`
      })
    },
    async sendMessage(messageObj) {
      io.to(messageObj.roomName).emit(EVENT_MESSAGE_UPDATE, {
        userName: messageObj.userName,
        messagePayload: messageObj.messagePayload
      })
      await chatStore.post(messageObj)
    },

    async getMessage(obj) {
      const msgs = await chatStore.get(obj.roomName, obj.options)
      socket.emit('message:get', msgs)
    },
    async debug() {
      const sockets = await redisClient.hgetall('sockets')
      console.log(sockets)
    },
  }
}
