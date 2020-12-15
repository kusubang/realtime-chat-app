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

const getUserName = socket => socket.$userName
const getRoomName = socket => socket.$roomName

const ChatMessageModel = require('./models/chat-message')

function ChatStore(redis) {
  async function post({roomName, userName, messagePayload}) {

    await redis.rpush(roomName, JSON.stringify({
      userName,
      messagePayload
    }))
  }

  async function get(roomName) {
    const msgObj = await redis.lrange(roomName, 0, 50)
    const msg = msgObj.map(v => JSON.parse(v))
    return msg
  }
  return {
    post,
    get
  }
}

function ChatStoreMongo() {

  async function post({ roomName, messagePayload, userName}) {
    const post = await ChatMessageModel.createPostInChatRoom(roomName, messagePayload, userName);

  }

  async function get(roomName, options = {
    page:0, limit: 3
  }) {
    const result = await ChatMessageModel.getConversationByRoomName(roomName, options)
    return result;
  }

  return {
    post,
    get
  }
}

function RoomStore(redis) {
  const KEY = 'rooms'
  return {
    async add(roomName) {
      await redis.sadd(KEY, roomName)
    },
    async get() {
      return await redis.smembers(KEY)
    }
  }
}

// const chatStore = ChatStore(redisClient)
const chatStore = ChatStoreMongo()
const roomStore = RoomStore(redisClient)

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
      // await redisClient.hmset('sockets', {[userName]: socket.id})
      // await redisClient.del('sockets')
      const sockets = await redisClient.hgetall('sockets')
      console.log(sockets)
    },
  }
}
