
const { log } = console

const MESSAGE = {
  CONNECT:'connect',
  DIS_CONNECT:'disconnect',
  LOGIN:'login',

  USER_LIST:'user:list',

  ROOM_CREATE:'room:create',
  ROOM_DELETE:'room:delete',
  ROOM_LIST:'room:list',
  ROOM_JOIN:'room:join',
  ROOM_LEAVE:'room:leave',

  MESSAGE_SEND: 'message:send',

  EVENT_ROOM_UPDATE: 'event:room:update',
  EVENT_ROOM_JOIN: 'event:room:join',
  EVENT_ROOM_LEAVE: 'event:room:leave',
  EVENT_MESSAGE_UPDATE: 'event:message:update',
}

const socket = io();

//  The Message is divided into two categories.
//  1. Response
//  2. Event(Notification)

const chatManagerMixin = {
  data() {
    return {
      messages: [],
      users: [],
      rooms: [],
      currentRoom: null,
    }
  },
  mounted() {
    const connected = ()=> {
      socket.emit('login', this.userName)
    }

    const disconnected = (reason) => {
      this.messages.push({
        userName: 'Admin',
        text: 'disconnected: ' + reason
      })
    }

    const ready = (rooms) => {
      this.rooms = rooms
      if(this.currentRoom) {
        this.joinRoom(this.currentRoom)
      }
    }

    const eventRoomUpdated = (rooms) => {
      this.rooms = rooms
    }

    const eventJoined = (msg) => {
      this.currentRoom = msg.roomName
      if(msg.targetUserName !== this.userName) {
        this.messages.push(msg)
      }
      this.getUserList(this.currentRoom)
      this.$emit('go-bottom')
    }

    const eventLeaved = (msg) => {
      this.messages.push(msg)
      this.getUserList(this.currentRoom)
    }

    const eventMessageUpdated = (value) => {
      console.log(value)
      this.messages.push(value)
      this.$emit('go-bottom')
    }

    const resJoined = (messages) => {
      this.messages = messages
      this.$emit('go-bottom')

    }

    const resUserList = (users) => {
      this.users = users
    }

    socket.on(MESSAGE.CONNECT, connected)
    socket.on(MESSAGE.DIS_CONNECT, disconnected)

    socket.on(MESSAGE.LOGIN, ready)

    socket.on(MESSAGE.ROOM_JOIN, resJoined)
    socket.on(MESSAGE.USER_LIST, resUserList)

    socket.on(MESSAGE.EVENT_ROOM_UPDATE, eventRoomUpdated)
    socket.on(MESSAGE.EVENT_ROOM_JOIN, eventJoined)
    socket.on(MESSAGE.EVENT_ROOM_LEAVE, eventLeaved)
    socket.on(MESSAGE.EVENT_MESSAGE_UPDATE, eventMessageUpdated)

    socket.on('message:get', (msgs) => {
      this.messages.unshift(...msgs)
      this.$emit('go-top', true)
    })

  },
  methods: {
    sendMessage(roomName, userName, messagePayload) {
      socket.emit(MESSAGE.MESSAGE_SEND, {
        roomName,
        userName,
        messagePayload
      })
    },
    createRoom(roomName) {
      socket.emit(MESSAGE.ROOM_CREATE, roomName)
    },
    deleteRoom(roomName) {
      socket.emit(MESSAGE.ROOM_DELETE, roomName)
    },
    joinRoom(roomName) {
      socket.emit(MESSAGE.ROOM_JOIN, roomName)
    },
    leaveRoom(roomName) {
      socket.emit(MESSAGE.ROOM_LEAVE, roomName)
      this.currentRoom = null
      this.messages = []
      this.users = []
    },
    getRooms() {
      socket.emit(MESSAGE.ROOM_LIST)
    },
    getUserList(roomName) {
      socket.emit(MESSAGE.USER_LIST, roomName)
    },
    debug() {
      socket.emit('debug')
    },
    getConversation(roomName, {limit, page}) {
      socket.emit('message:get', {
        roomName,
        options: {limit, page}
      })
    }
  }
}

const randomId = prefix => prefix + '-' + Math.floor(Math.random() * 100000)

const scrollToBottom = (elem, value = 0) => {
  if(elem) {
    elem.scrollTop = elem.scrollHeight - value
  }
};
window.app = new Vue({
  el: '#app',
  mixins: [chatManagerMixin],
  data: {
    userName: randomId('USER'),
    roomName: randomId('ROOM'),
    text: '',
    loading: false,
  },
  mounted() {
    this.$on('go-bottom', () => {
      this.$nextTick(() => this.goBottom())
    })

    this.$on('go-top', () => {
      const el = this.$refs["msgBox"]
      el.scrollTop = 5
      setTimeout(() => {
        this.loading = false;
      }, 1000)

    })
  },
  created() {

  },
  destroyed() {
    this.$refs["msgBox"].removeEventListener('scroll', this.handleScroll);
  },
  methods: {
    scroll(e) {
      const limit = 3
       if(e.target.scrollTop === 0) {
        this.getConversation(this.currentRoom, {
          page: Math.floor(this.messages.length / limit),
          limit
        })
        this.loading = true;
      }
    },
    login() {
    },
    goBottom(value) {
      scrollToBottom(this.$refs["msgBox"], value)
    },
    sendMsg(roomName, userName, text) {
      this.sendMessage(roomName, userName, text)
      this.text = ''
    },
   }
})
