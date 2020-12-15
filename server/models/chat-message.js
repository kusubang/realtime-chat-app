
const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const chatMessageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
    chatRoomName: String,
    messagePayload: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      default: () => 'text',
    },
    userName: String,
  },
  {
    timestamps: true,
    collection: "chatmessages",
  }
);

chatMessageSchema.statics.createPostInChatRoom = async function (chatRoomName, messagePayload, userName) {
  try {
    const post = await this.create({
      chatRoomName,
      messagePayload,
      userName,
    });
  } catch (err) {
    throw err
  }
}

chatMessageSchema.statics.getConversationByRoomName = async function (chatRoomName, options = {}) {
  // console.log('get:', chatRoomName, options)
  try {
    return this.aggregate([
      { $match: { chatRoomName } },
      { $sort: { createdAt: -1 } },
      // do a join on another table called users, and
      // get me a user whose _id = postedByUser
      // {
      //   $lookup: {
      //     from: 'users',
      //     localField: 'postedByUser',
      //     foreignField: '_id',
      //     as: 'postedByUser',
      //   }
      // },
      // { $unwind: "$postedByUser" },
      // apply pagination
      { $skip: options.page * options.limit },
      { $limit: options.limit },
      { $sort: { createdAt: 1 } },
    ]);
  } catch (error) {
    throw error;
  }
}

module.exports = mongoose.model('ChatMessage', chatMessageSchema)
