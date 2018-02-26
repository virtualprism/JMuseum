const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * 站內信件。一封信件中內有基本的主旨、內容、寄件者等等資訊。
 * @prop {String} title 主旨。
 * @prop {String} content 內文。
 * @prop {String} sender 寄件者。
 * @prop {String} isPrivate 是否為私人信件。若為是，表示只有收件者看得到；反之則否。
 * @prop {Date} sendTime 寄件時間。
 */
let SiteMailSchema = Schema({
    title: String,
    content: String,
    sender: String,
    isPrivate: Boolean,
    sendTime: {type: Date, default: new Date()}
});

// 建立一個新的站內信件。回傳站內信的_id。
SiteMailSchema.statics.createNewSiteMail = function (data, callback) {
    let newSiteMail = this({
        title: data.title,
        content: data.content,
        sender: data.sender,
        isPrivate: data.isPrivate,
        sendTime: data.sendTime
    });
    newSiteMail.save((err, siteMail) => {
        if (err)
            callback(err, null);
        else
            callback(null, siteMail._id);
    });
}

module.exports = mongoose.model("SiteMail", SiteMailSchema);