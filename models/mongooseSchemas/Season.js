const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ServerStatus = require("../../ServerStatus");
const Theme = require("./Theme");
const NewTheme = require("./NewTheme");

/**
 * 回呼函式。
 * @callback CallbackFunction
 * @param {Object} err 錯誤資訊物件。
 * @param {Object} obj 傳回的物件。
 */

/**
 * 「季」的模板定義。
 *  @prop {number} nth 表示目前的資料是第nth季
 *  @prop {Schema.Types.ObjectId[]} themes 這一季的所有主題。
 *  @prop {Date} startTime 這一季的開始時間。
 *  @prop {Date} endTime 這一季的結束時間。
 */
let SeasonSchema = Schema({
    nth: Number,
    themes: [{type : Schema.Types.ObjectId, ref : "Theme"}],
    startTime: {type : Date, default : Date.now},
    endTime: Date
});

/**
 * 新一季的必要的基本資料。
 * @typedef NewSeasonData
 * @prop {number} nth 紀錄此資料為第nth季。
 * @prop {ObjectId[]} themes 這一季所有的活動。以ObjectId做關聯。
 * @prop {Date} startTime 開始這一季時的時間。
 */
/**
 * 建立一個新的「季」資料。
 * @param {Object} data 欲儲存的原始資料。
 * @param {function} callback 回呼函式(Error, ObjectId)。
 */
SeasonSchema.statics.createNewSeason = function (data, callback) {
    let newSeason = this({
        nth: data.nth,
        themes: data.themes,
        startTime: data.startTime,
        endTime: null
    });
    newSeason.save((err, season) => {
        if (err) return callback(err, null);
        callback(null, season._id);
    });
}

/**
 * 取得「傑作藝廊」頁面所需的資料。
 * 注意: 要取用相關資料時，必須先將Theme與ParticipantInfo資料表引入。
 * @param {CallbackFunction} callback 回呼函式。含有錯誤訊息物件或資料物件。
 */
SeasonSchema.statics.GetGalleryNeedInfo = function (callback) {
    // 取得一季之中所有的「主題 (themes)」與「季次 (nth)」
    // 所有主題中的「編號 (order)」、「標題 (title)」與「參加作品 (participants)」
    // 參加作品中的「排行 (rank)」、「作者 (artist)」、「作品敘述 (description)」與「投稿時間 (postTime)」
    let curNthSeason = ServerStatus.status.currentSeason;
    let populateQuery = {
        path : "themes",
        select : {"order": 1, "title": 1, "participants": 1},
        populate : {
            path : "participants",
            select : {"rank": 1, "artist": 1, "description": 1, "postTime": 1}
        }
    };
    // {"nth": {$lt: curNthSeason}} 中的 $lt: curNthSeason 表示不要選取到最新一季。
    this.find({"nth": {$lt: curNthSeason}}).sort({nth: -1}).select("nth themes").populate(populateQuery).exec(callback);
}

/**
 * 取得在「畫作主題」頁面下所需要的插值資料。
 * @param {CallbackFunction} callback 回呼函式。含有錯誤訊息物件或資料物件。
 */
SeasonSchema.statics.GetThemePageNeedInfo = function (callback) {
    let result = {currentSeason: null, lastSeason: null};
    let currentSeasonPopulate = {path: "themes", select: {"order": 1, "title": 1, "narrative": 1, "imageURL": 1, "originator": 1, "participentCount": 1, "views": 1, "commentCount": 1}};
    let lastSeasonPopulate = {path: "themes", select: {"order": 1, "title": 1, "originator": 1}};
    let currentNthSeason = ServerStatus.status.currentSeason;
    // 以nth尋找最新的一季，在選擇其中的「nth」與「themes」欄位
    // 並對「themes」展開，選擇其中的指定欄位，然後執行以上動作。
    this.findOne({"nth": currentNthSeason})
        .select("nth themes")
        .populate(currentSeasonPopulate)
        .exec((err, curSeason) => {
            if (err) {
                callback(err, null);
                return;
            }
            result.currentSeason = curSeason;
            // 接著尋找上一季，指定「nth」、「endTime」與「themes」欄位
            // 並對「themes」展開，選擇其中的指定欄位，然後執行以上動作。
            this.findOne({"nth": currentNthSeason - 1})
                .select("nth endTime themes")
                .populate(lastSeasonPopulate)
                .exec((err, lastSeason) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }
                    result.lastSeason = lastSeason;
                    callback(null, result);
                    return;
            });
    });
}

/**
 * 將畫作主題活動推進新的一季。
 * 注意，ServerStatus.status中的currentSeason必須要先推進到新的一季，否則會相衝。
 * @param {CallbackFunction} callback 回呼函式。
 */
SeasonSchema.statics.PushNewSeason = function (callback) {
    let promotionCount = ServerStatus.status.promotionCount;        // 取得要選取多少個候選主題至正規主題中
    let curNthSeason = ServerStatus.status.currentSeason;
    let Season = this;
    // 首先先更新上一季的結束時間
    Season.update({ nth: curNthSeason - 1 }, { $set: { "endTime": new Date() } }, (err, seasonDocs) => {
        if(err) return callback(err, "\n更新前一季的時間時\n");
    });
    // 做統合，取NewTheme中所有的欄位，並建立一個 "voteCount" 欄位來記錄 votes 中有有多少個項目
    // 然後再先後以投票數量(voteCount)與投稿時間(createdTime)來做排序，並選取前N個(promotionCount)作為新一季的新主題。
    NewTheme.aggregate(
        [
            { "$project": {
                title: 1,
                narrative: 1,
                image: 1,
                sponsor: 1,
                votes: 1,
                createdTime: 1,
                voteCount: { "$size": "$votes" }
            }},
            { "$sort": { "voteCount": -1 } },
            { "$sort": { "createdTime": 1 } },
            { "$limit": promotionCount }
        ],
        function (err, docsList) {
            if (err) return callback(err, "\n取得指定候選主題時發生了錯誤。請確認是否有連接MongoDB並重新嘗試。\n");
            // 將指定的候選主題轉換到正規的主題(Theme)中。其中處理完成後回呼_id清單。
            Theme.TransferFromNewTheme(docsList, (err, _idList) => {
                if (err) return callback(err, "\n將候選主題轉換至正規主題時發生了錯誤。請確認是否有連接MongoDB並重新嘗試。\n");

                // 建立基本新的一季(Season)的資料
                let data = {
                    nth: ServerStatus.status.currentSeason,
                    themes: _idList,
                    startTime: new Date()
                };
                // 利用data建立最新一季的資料
                Season.createNewSeason(data, (err, _id) => {
                    if (err) return callback(err, "\n建立新一季的活動資料時發生了錯誤。請確認是否有連接MongoDB並重新嘗試。\n");
                    // 將所有的候選主題都清空
                    NewTheme.remove({}, (err) => { 
                        if (err) return callback(err, "\n在清空NewTheme中所有資料時發生了錯誤。請改用手動的方式刪除或檢查是否有連接MongoDB。\n");
                        callback(null, true);
                    });
                });
            });
        }
    )
}

module.exports = mongoose.model("Season", SeasonSchema);