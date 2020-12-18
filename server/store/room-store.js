
function RoomStore(redis) {
  const KEY = 'rooms'
  return {
    async add(roomName) {
      await redis.sadd(KEY, roomName)
    },
    async get() {
      return await redis.smembers(KEY)
    },
    async delete(roomName) {
      await redis.srem("rooms", roomName);
    },
  }
}

module.exports = RoomStore
