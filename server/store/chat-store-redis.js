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

module.exports = ChatStore;
