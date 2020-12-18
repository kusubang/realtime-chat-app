
function UserStore(redis) {
  return {
    async set(userName, socketId) {
      await redis.hmset('sockets', {[userName]: socketId})
    },
    async get() {
      return await redis.hgetall('sockets');
    },
    async delete(userName) {
      await redis.hdel('sockets', userName)
    }
  }
}

module.exports = UserStore
