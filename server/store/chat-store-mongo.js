const ChatMessageModel = require('../models/chat-message')

function ChatStoreMongo() {

  async function post({ roomName, messagePayload, userName}) {
    return await ChatMessageModel.createPostInChatRoom(
      roomName,
      messagePayload,
      userName
    );
  }

  async function get(roomName, options = { page:0, limit: 5 }) {
    return await ChatMessageModel.getConversationByRoomName(roomName, options)
  }

  return {
    post,
    get
  }
}

module.exports = ChatStoreMongo
