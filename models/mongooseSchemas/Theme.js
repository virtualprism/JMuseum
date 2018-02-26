const fileSystem = require("fs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ServerStatus = require("../../ServerStatus");

// 建立「主題」樣板
let ThemeSchema = Schema({
    order : Number,
    title : String,
    narrative : String,
    image : String,         // URL
    originator : String,
    participants : [{ type : Schema.Types.ObjectId, ref : "ParticipantInfo" }],
    views : Number,
    commentCount : Number
});

// 透過參數data來建立「主題」資料於表中。
ThemeSchema.statics.createNewTheme = function (data, callback) {
    let newTheme = this({
        order : data.order,
        title : data.title,
        narrative : data.narrative,
        image : data.image,         // URL
        originator : data.originator,
        participants : data.participants,
        views : data.views,
        commentCount : data.commentCount
    });
    newTheme.save((err, theme) => {
        if (err)
            callback(err, null);
        else
            callback(null, theme._id);
    });
}

/**
 * 轉移完成後回呼的函式定義。
 * @callback TransferCallback
 * @param {Error?} error 錯誤訊息物件。
 * @param {ObjectId[]?} docs_id 轉換後的所有主題對應的_id。
 */
/**
 * 自候選主題(NewTheme)轉移到主題(Theme)。當活動狀態要推向新的一季時所會用到的函式。
 * @param {NewTheme[]} newThemeDocs 要轉移的候選主題。
 * @param {TransferCallback} callback 回呼函式。
 */
ThemeSchema.statics.TransferFromNewTheme = function (newThemeDocs, callback) {
    let projectRoot = global.__dirname;                     // 此專案的根目錄
    let curNthSeason = ServerStatus.status.currentSeason;   // 取得目前最新一季的季數
    let newThemeDatas = [];                                 // 用來新增Theme資料的集合清單

    // 為每一個選中的候選主題建立Theme資料
    newThemeDatas.forEach((docs, index) => {
        let routePath = docs.image.split("/");                                  // 以字元"/"分解字串，取得路徑
        let fileName = routePath[routePath.length - 1];                         // 取得檔案名稱
        let URLFilePath = "/images/seasons/" + curNthSeason + "/" + fileName;   // 找資源用的URL檔案路徑
        let newFilePath = "/public" + URLFilePath;                              // 儲存用的相對檔案路徑

        // 將建立主題的基本資料加入至newThemeDatas中
        newThemeDatas.push({
            order: index,
            title: docs.title,
            narrative: docs.narrative,
            image: "/images/seasons/" + curNthSeason + "/" + fileName,
            originator: docs.sponsor,
            participants: [],
            views: 0,
            commentCount: 0
        });

        // 將檔案移動至新的資料夾中。
        // 從位置 "/public/images/newtheme" 轉移到 "/public/images/seasons/[currentNthSeason]" 之下
        // 其中檔案名稱不變。
        fileSystem.rename(projectRoot + "/public" + docs.image, projectRoot + newFilePath, (err) => {
            console.log("「轉移候選主題」: 在移動檔案\"%s\"至\"%s\"時發生了錯誤。", "/public" + docs.image, newFilePath);
        });
    });

    // 將所有選取的候選主題資料，插入、新增到Theme之中，並且回呼這些資料的_id，組成ObjectId清單。
    this.insertMany(newThemeDatas, (err, docsList) => {
        if (err) return callback(err, null);
        callback(null, docsList.map(docs => docs._id));
    });
}

module.exports = mongoose.model("Theme", ThemeSchema);