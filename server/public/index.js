
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
  MESSAGE_GET: 'message:get',

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
  computed: {
    // compiledMarkdown() {
    //   return marked(this.input, { sanitize: true });
    // }
  },
  mounted() {
    const connected = ()=> {
      log('connected', 'success')
      socket.emit('login', this.userName)
      if(this.currentRoom) {
        this.joinRoom(this.currentRoom)
      }
    }

    const disconnected = (reason) => {
      log('disconnected', reason)
      this.messages.push({
        userName: 'Admin',
        messagePayload: 'disconnected: ' + reason
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

    const eventMessageUpdated = (value) => {
      this.messages.push(value)
      this.$emit('ui:message:added')
    }

    const resJoined = (messages) => {
      this.messages = messages
      this.$emit('ui:message:added')

    }

    const resUserList = (users) => {
      this.users = users
    }

    const resMessageGet = (msgs) => {
      this.messages.unshift(...msgs)
      this.$emit('ui:message:shifed', true)
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

    socket.on(MESSAGE.MESSAGE_GET, resMessageGet)

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
      this.currentRoom = roomName
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
      socket.emit(MESSAGE.MESSAGE_GET, {
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
  created() {
    // const currentRoom = localStorage.getItem('currentRoom', '');
    // if(currentRoom) {
    //   this.joinRoom(currentRoom)
    // }

    // window.onbeforeunload = () => {
    //   localStorage.setItem('currentRoom', this.currentRoom);
    //   return 'Are you sure you want to close the window?';
    // }
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
       if(e.target.scrollTop === 0 && this.messages.length >= 5) {
        this.needMore = true
      }
    },
    login() {
      const currentRoom = localStorage.getItem('currentRoom', '');
      if(currentRoom) {
        this.joinRoom(currentRoom)
      }
      this.isLoggedIn = true
    },

    compiledMarkdown(value) {
      return marked(value, { sanitize: true });
    },

    more() {
      this.loading = true;
      this.getConversation(this.currentRoom, {
        page: Math.floor(this.messages.length / this.limit),
        limit: this.limit
      })
      this.needMore = false;

    },
    goBottom() {
      scrollToBottom(this.$refs['msgBox'])
    },
    sendMsg(roomName, userName, text) {
      this.sendMessage(roomName, userName, text)
      this.text = ''
    },
   }
})
