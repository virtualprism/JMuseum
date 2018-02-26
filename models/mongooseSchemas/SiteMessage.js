const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let SiteMessageSchema = Schema({
    from : { type : String, enum : ["server", "personal"] },
    title : { type : String, default : "Title" },
    content : { type : String, default : "" },
    refId : { type : Schema.Types.ObjectId, ref : "ServerMessage" },
    id : { type : Number },
    isSeen : { type : Boolean, default : false },
    isPrivate : { type : Boolean, default : false }
});

/**
 * @typedef NewSiteMessageData
 * @prop {string} from 表示來自「伺服公告」(“server”) 或是「個人訊息」(“personal”)。
 * @prop {string} title 訊息標題。
 * @prop {string?} content 訊息內容 (可為HTML格式。當 from 為 “personal”時此項才會有內容)。
 * @prop {string?} refId 訊息參考 (參考NoticeBoard中的訊息，當 from 為 “server” 時此項才會有內容)。
 * @prop {number} id 訊息編號。
 * @prop {boolean} isPrivate 是否為私人訊息。
 */
/**
 * 建立一個主頁訊息資料。
 * @param {NewSiteMessageData} data 建立一個新的主頁訊息所需的基本資料。
 * @param {CallbackFunction} callback 回呼函式。
 */
SiteMessageSchema.statics.createNewSiteMessage = function (data, callback) {
    let newSiteMsg = this({
        from : data.from,
        title : data.title,
        content : data.content,
        refId : data.refId,
        id : data.id,
        isSeen : false,
        isPrivate : data.isPrivate
    });
    newSiteMsg.save((err, siteMsg) => {
        if (err)
            callback(err, null);
        else
            callback(err, siteMsg._id);
    });
};

module.exports = mongoose.model("SiteMessage", SiteMessageSchema);