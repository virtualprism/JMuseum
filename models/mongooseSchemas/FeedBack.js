const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FeedbackSchema = Schema({
    username: String,
    time: { type: Date, default: Date.now },
    title: String,
    content: String
});

/**
 * @typedef NewFeedbackData
 * @prop {string} username 傳送此回饋的使用者名稱。
 * @prop {string} title 回饋的標題。
 * @prop {string} content 回饋的內容。
 */
/**
 * 建立一個新的回饋資料。
 * @param {NewFeedbackData} data 新增一個回饋資料所需的基本資料。
 * @param {CallbackFunction} callback 回呼函式。失敗時將錯誤回呼；成功時將_id回呼。
 */
FeedbackSchema.statics.createNewFeedback = function (data, callback) {
    let newFeedback = this({
        username: data.username,
        time: new Date(),
        title: data.title,
        content: data.content   
    });
    newFeedback.save((err, docs) => {
        if (err) return callback(err, null);
        callback(null, docs._id);
    });
}