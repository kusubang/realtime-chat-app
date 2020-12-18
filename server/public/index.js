
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
  CONVERSATION_GET: 'conversation:get',

  EVENT_ROOM_UPDATE: 'event:room:update',
  EVENT_ROOM_JOIN: 'event:room:join',
  EVENT_ROOM_LEAVE: 'event:room:leave',
  EVENT_MESSAGE_UPDATE: 'event:message:update',
}

function log(message, color = 'black') {
  switch (color) {
    case 'success':
      color = 'Green';
      break;
    case 'info':
      color = 'DodgerBlue';
      break;
    case 'error':
      color = 'Red';
      break;
    case 'warning':
      color = 'Orange';
      break;
    default:
      color = color;
  }
  console.log('%c' + message, 'color:' + color);
}

const socket = io({
  transports: [ 'websocket' ]
});

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
      input: '# hello',

    }
  },
  mounted() {
    const connected = async ()=> {
      log('connected', 'success')
      if(this.userName && this.currentRoom) {
        socket.emit('login', this.userName, (error, rooms) => {
          if(error) {
            log(error, 'error')
            return
          }
          this.joinRoom(this.currentRoom)
        })
      }
    }

    const disconnected = (reason) => {
      log(`disconnected - ${reason}`, 'warning')
      this.messages.push({
        userName: 'Admin',
        messagePayload: 'disconnected: ' + reason
      })
    }

    const eventRoomUpdated = (rooms) => {
      this.rooms = rooms
    }

    const eventJoined = (msg) => {
      console.log('event: joined')
      if(msg.targetUserName !== this.userName) {
        this.messages.push(msg)
      }
      this.getUserList(this.currentRoom)
      this.$emit('ui:message:added')
    }

    const eventLeaved = (msg) => {
      this.messages.push(msg)
      this.getUserList(this.currentRoom)
    }

    const eventMessageUpdated = (value) =>   {
      this.messages.push(value)
      this.$emit('ui:message:added')
    }

    socket.on(MESSAGE.CONNECT, connected )
    socket.on(MESSAGE.DIS_CONNECT, disconnected)

    socket.on(MESSAGE.EVENT_ROOM_UPDATE, eventRoomUpdated)
    socket.on(MESSAGE.EVENT_ROOM_JOIN, eventJoined)
    socket.on(MESSAGE.EVENT_ROOM_LEAVE, eventLeaved)
    socket.on(MESSAGE.EVENT_MESSAGE_UPDATE, eventMessageUpdated)

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
      socket.emit(MESSAGE.ROOM_JOIN, roomName, (messages) => {
        this.messages = messages
        this.$emit('ui:message:added')
        log(`joined ${roomName}`)
      })
      this.currentRoom = roomName

    },
    leaveRoom(roomName) {
      socket.emit(MESSAGE.ROOM_LEAVE, roomName)
      this.currentRoom = null
      this.messages = []
      this.users = []
    },
    getRooms() {
      socket.emit(MESSAGE.ROOM_LIST, rooms => {
        this.rooms = rooms
      })
    },
    getUserList(roomName) {
      console.log('get user list:', roomName)
      socket.emit(MESSAGE.USER_LIST, roomName, (users) => {
        console.log('update user list:', users)
        this.users = users
      })
    },
    debug() {
      socket.emit('debug')
    },
    getConversation(roomName, {limit, page}) {
      console.log('getConversation')
      const option = {
        roomName,
        options: {limit, page}
      }
      socket.emit(MESSAGE.CONVERSATION_GET, option, (messages)=>{
        console.log('success get conversation')
        this.messages.unshift(...messages)
        this.$emit('ui:message:shifed', true)
      })
    }
  }
}

const randomId = prefix => prefix + '-' + Math.floor(Math.random() * 100000)

const scrollToBottom = (elem, value = 0) => {
  if(elem) {
    elem.scrollTop = elem.scrollHeight - value
  }
}

window.app = new Vue({
  el: '#app',
  mixins: [chatManagerMixin],
  data: {
    // userName: randomId('USER'),
    userName: 'user1',
    // roomName: randomId('ROOM'),
    roomName: 'ROOM',
    text: '',
    loading: false,
    needMore: false,
    limit: 5,
    isLoggedIn: false,
  },
  mounted() {
    this.$on('ui:message:added', () => {
      this.$nextTick(() => this.goBottom())
    })

    this.$on('ui:message:shifed', () => {
      const el = this.$refs['msgBox']
      setTimeout(() => {
        this.loading = false;
        el.scrollTop = el.scrollTop + 200
      }, 1000)
    })
  },
  async created() {
    // const currentRoom = localStorage.getItem('currentRoom', '');
    // if(currentRoom) {
    //   this.joinRoom(currentRoom)
    // }

    // window.onbeforeunload = () => {
    //   localStorage.setItem('currentRoom', this.currentRoom);
    //   return 'Are you sure you want to close the window?';
    // }

    // await this.getRooms()
  },
  destroyed() {
    this.$refs['msgBox'].removeEventListener('scroll', this.handleScroll);
    localStorage.setItem('currentRoom', this.currentRoom);
  },
  methods: {
    scroll(e) {
      if(this.loading) {
        return
      }
       if(e.target.scrollTop === 0 && this.messages.length >= this.limit) {
        this.needMore = true
      }
    },
    async login() {
      if(!this.userName) {
        return
      }
      socket.emit('login', this.userName, (error, rooms) => {
        if(error) {
          log(error, 'error')
          return;
        }

        this.rooms = rooms
        // const currentRoom = localStorage.getItem('currentRoom', '');
        // this.currentRoom = currentRoom
        // if(currentRoom) {
          // this.joinRoom(currentRoom)
        // }
        this.isLoggedIn = true
      })
    },
    compiledMarkdown(value) {
      return marked(value, { sanitize: true });
    },
    more() {
      this.loading = true;
      const option = {
        page: Math.floor(this.messages.length / this.limit),
        limit: this.limit
      }
      this.getConversation(this.currentRoom, option)
      this.needMore = false;
    },
    goBottom() {
      scrollToBottom(this.$refs['msgBox'])
    },
    sendMsg(roomName, userName, text) {
      this.sendMessage(roomName, userName, text)
      this.text = ''
    },
    leave() {
      this.leaveRoom(this.currentRoom)
      this.needMore = false
      this.messages = []
    },
    hello() {
      const text = `
      █░░█ █▀▀ █░░ █░░ █▀▀█
      █▀▀█ █▀▀ █░░ █░░ █░░█
      ▀░░▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀▀▀▀  `

      this.sendMsg(this.currentRoom, this.userName, text)
    },
   }
})
