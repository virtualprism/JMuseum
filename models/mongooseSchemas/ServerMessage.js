const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let ServerMessageSchema = Schema({
    title: String,
    content: String
});

/**
 * @typedef NewServerMessageData
 * @param {string} title 訊息主題。
 * @param {string} content 訊息內容。
 */

/**
 * 建立一個新的伺服訊息資料。
 * @param {NewServerMessageData} data 建立一個新的伺服訊息資料的必要資料。
 * @param {CallbackFunction} callback 回呼函式。
 */
ServerMessageSchema.statics.createNewServerMessage = function (data, callback) {
    let newServMsg = this({ title: data.title, content: data.content });
    newServMsg.save((err) => {
        if (err) return callback(err, null);
        callback(null, newServMsg._id);
    });
}

module.exports = mongoose.model("ServerMessage", ServerMessageSchema);
