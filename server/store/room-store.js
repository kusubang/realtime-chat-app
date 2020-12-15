
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

module.exports = RoomStore
