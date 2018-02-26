const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const User = require("./User");

const Error_HaveSameThemeTitle = new Error("已經存在相同的主題名稱。");
const Error_ExistSameSponser = new Error("使用者已經在先前發起過一次主題了。");

let NewTheme = Schema({
    title: String,
    narrative: String,
    image: String,          // Image URL
    sponsor: String,
    votes: [String],
    createdTime: { type: Date, default: Date.now }
});

/**
 * 外部傳進來的新主題的必要資料項。
 * @typedef NewThemeDatas
 * @prop {string} title 新主題的主題名稱。
 * @prop {string} narrative 新主題的主題敘述。
 * @prop {string} image 新主題的圖示的連結位置。
 * @prop {string} sponsor 此新主題的發起人之使用者名稱。
 */
/**
 * 建立一個新的「新主題」資料。
 * @param {NewThemeDatas} datas 原初的資料集合。
 * @param {CallbackFunction} callback 回呼函式。成功時回呼_id。
 */
NewTheme.statics.createNew_NewTheme = function(datas, callback) {
    // 先檢查是否已有存在了相同的主題名稱 或 發起人在先前已經有發起過一次了
    this.findOne({title: datas.title}, (err, docs) => {
        if (err) return callback(err, null);
        if (docs) return callback(Error_HaveSameThemeTitle, null);  // 若使用者發起的主題名稱，別人已經發起過，則回呼錯誤

        // 建立新的主題名稱資料
        let new_NewTheme = this({
            title: datas.title,
            narrative: datas.narrative,
            image: datas.image,
            sponsor: datas.sponsor,
            votes: [],
            createdTime: new Date()
        });
        
        // 將其儲存後並回呼
        new_NewTheme.save((err) => {
            if (err) return callback(err, null);
            callback(null, new_NewTheme._id);
        }); 
    });
}

/**
 * 檢查是否為「已經存在相同的主題名稱」之錯誤。
 * @param {Error} error 欲進行檢查的錯誤。
 * @return {boolean} 檢查之結果。
 */
NewTheme.statics.IsError_HaveSameThemeTitle = function (error) {
    return error === Error_HaveSameThemeTitle;
}

/**
 * 檢查是否為「已經存在相同的主題名稱」之錯誤。
 * @param {Error} error 欲進行檢查的錯誤。
 * @return {boolean} 檢查之結果。
 */
NewTheme.statics.IsError_ExistSameSponser = function (error) {
    return error === Error_ExistSameSponser;
}

module.exports = mongoose.model("NewTheme", NewTheme);