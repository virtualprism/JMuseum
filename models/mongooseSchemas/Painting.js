const mongoose = require("mongoose");
const Jimp = require("jimp");
const uuid = require("uuid/v4");

const Participation = require("./Participation");
const Rating = require("./Rating");
const Comment = require("./Comment");
let User;

const Schema = mongoose.Schema;

const Error_PaintingNotExist = new Error("尋找的目標畫作不存在。");
const Error_PaintingIsLocked = new Error("此畫作已被鎖定，無法對其做任何修改。");
const Error_PaintingHasFinished = new Error("此畫作已經完成，無法再做一次完成的動作。");

let PaintingSchema = Schema({
    id: String,
    links: String,
    name: String,
    description: String,
    artist: String,
    createdTime: {type : Date, default : Date.now },
    lastModified: {type : Date, default : Date.now },
    tags: [{type : String}],
    activity: {type : Schema.Types.ObjectId, ref: "Participation"},
    viewAuthority: Number,
    totalScore: Number,
    ratings: [{type : Schema.Types.ObjectId, ref: "Rating"}],
    comments: [{type : Schema.Types.ObjectId, ref: "Comment"}],
    isFinished: Boolean,
    isLocked: Boolean
});

/**
 * 交叉引入，由User來呼叫。
 */
PaintingSchema.statics.crossInitByUser = function () {
    User = Object.freeze(require("./User"));
}

/**
 * 建立新畫作的基本必要資料。
 * @typedef NewPaintingData
 * @prop {string} name 作品名稱。
 * @prop {string} description 作品的敘述。
 * @prop {string} artist 畫作的作者。即使用者名稱。
 * @prop {string[]} tags 此畫作的標籤。
 * @prop {number} viewAuthority 作品的訪問權限。0=公開；1=半公開；2=私人。
 * @prop {boolean} isFinished 作品是否完成。
 */
/**
 * 建立一個新的畫作。
 * @param {NewPaintingData} data 用於建立新畫作的基本資料。
 * @param {CallbackFunction} callback 回呼函式。成功時回呼畫作的_id。
 */
PaintingSchema.statics.createNewPainting = function (data, callback) {
    let createdDate = new Date();
    let paintingUUID = uuid();
    let newPainting = this({
        id : paintingUUID,
        links : "/db/paintings/" + paintingUUID + ".png",
        name : data.name,
        description	: data.description,
        artist : data.artist,
        createdTime	: createdDate,
        lastModified : createdDate,
        tags : data.tags,
        activity : null,
        viewAuthority : data.viewAuthority,
        totalScore : 0,
        ratings	: [],
        comments : [],
        isFinished : data.isFinished,
        isLocked : false
    });
    newPainting.save((err, painting) => {
        if (err)
            callback(err, null);
        else
            callback(null, {_id: painting._id, id: paintingUUID, lastModified: createdDate});
    });
};

/**
 * 一個包含所有要更新的圖畫資訊的物件。
 * @typedef NewPaintingInfo
 * @prop {string} name 作品名稱
 * @prop {string} description 作品的敘述。
 * @prop {string[]} taglist 標籤清單。
 * @prop {number} view_authority 作品的訪問權限。
 * @prop {boolean} isFinished 作品是否完成。
 */
/**
 * 透過傳入的圖畫id尋找目標的圖畫資料，以new_info來更新其資訊。
 * @param {NewPaintingInfo} new_info 要更新目標圖畫資訊的物件。
 * @param {string} id 目標圖畫資料的ID。
 * @param {Jimp.Jimp} image Jimp影像物件。用來更新圖畫資料。
 * @param {CallbackFunction} callback 回呼函式。若成功則回呼圖畫的_id與最後更新時間；其餘皆為錯誤。
 */
PaintingSchema.statics.UpdateInfoById = function (new_info, id, image, callback) {
    // 以圖畫id來取得目標資料
    this.findOne({"id": id}, (err, paintingDocs) => {
        if (err) return callback(err, null);
        if (!paintingDocs) return callback(Error_PaintingNotExist, null);           // 若找不到畫作資料，則回呼錯誤
        if (paintingDocs.isLocked) return callback(Error_PaintingIsLocked, null);   // 若目標畫作為「鎖定」狀態，則回乎錯誤
        let isFinished_before = paintingDocs.isFinished;                            // 取得更改之前的isFinished的狀態
        let newLastModified = new Date();                                           // 更新「最後修改日期」的時間

        // 若目前作品已完成 且 使用者還想再次「完成」此作品，則回報錯誤
        if (isFinished_before && new_info.isFinished) return callback(Error_PaintingHasFinished, null);

        // 更新資料
        paintingDocs.name = new_info.name;
        paintingDocs.description = new_info.description;
        paintingDocs.tags = new_info.taglist;
        paintingDocs.viewAuthority = new_info.view_authority;

        // 「最後修改日期」是隨著圖畫內容是否更動而變的
        if (!isFinished_before)
            paintingDocs.lastModified = newLastModified;

        // 一但完成作品之後，就不會再回到「沒有完成」的狀態了。
        paintingDocs.isFinished = isFinished_before || new_info.isFinished;

        // 將圖畫資料儲存後並回呼
        paintingDocs.save((err) => {
            if (err) return callback(err, null);
            
            /**
             * 幾本上針對「作品完成」狀態與動作有四種情況:
             *      儲存前     儲存動作
             * 1.   未完成     不完成 : 作品未完成情況下，執行一般的「儲存」動作。
             * 2.   未完成     　完成 : 作品未完成情況下，執行「完成圖畫」的動作。
             * 3.   已完成     不完成 : 作品已完成情況下，執行一般的「儲存」動作。也就是不更改畫作影像，僅變更畫作的相關資訊。動作完成後，圖畫仍為「完成」狀態。
             * 4.   已完成     　完成 : 作品已完成情況下，執行「完成圖畫」的動作。這是不被允許的，一個作品完成之後就不能再「完成」第二次。
             * 在上頭的程式碼 "if (isFinished_before && new_info.isFinished) ..." 中，已將第4種情況剔除，
             * 因此以下拿 paintingDocs.isFinished 來判斷是否更新圖畫影像。
             */
            if (!isFinished_before) {
                // 將新的影像複寫在舊的影像之上
                image.write("./db/paintings/" + paintingDocs.id + ".png", (err) => {
                    if (err) return callback(err, null);
                    callback(null, {_id: paintingDocs._id, lastModified: newLastModified});
                });
            }
            else {
                callback(null, {_id: paintingDocs._id, lastModified: newLastModified});
            }
        });
    });
}

/**
 * 確認使用者(user_id)對於畫作(paintingId)的訪問權限是否足夠。
 * 若訪問權限足夠，回呼圖畫id；反之，則回呼false。
 * @param {string} paintingId 畫作的Id。
 * @param {string} user_id 使用者的_id。
 * @param {CallbackFunction} callback 回呼函式。
 */
PaintingSchema.statics.CheckViewAuthority = function (paintingId, user_id, callback) {
    this.findOne({"id": paintingId})
        .select("id artist link viewAuthority")
        .exec((err, paintingDocs) => {
            if (err) return callback(err, null);
            if (!paintingDocs) return callback(null, false);        // 若尋找的圖畫Id不存在，則回乎false。

            // 當訪問權限為「公開」時，則直接回呼
            if (paintingDocs.viewAuthority == 0) {
                callback(null, paintingId);
            }
            // 當訪問權限為「半公開」或「私人」時，且使用者有登入時，則近一步判斷。
            else if (user_id){
                // 取得圖畫作者的資料，判斷使用者是否正為圖畫作者 或 圖畫作者的好友。
                User.findOne({"username": paintingDocs.artist}, "_id friendList", (err, artistDocs) => {
                    if (err) return callback(err, null);
                    let isArtist = user_id == artistDocs._id;                               // 使用者是否為圖畫作者
                    let isFriend = artistDocs.IsUsersFriend(user_id);                       // 使用者是否為圖畫作者的好友
                    let check = isArtist || (paintingDocs.viewAuthority == 1 && isFriend);  // 只要是圖畫作者 或 圖畫作者的朋友且訪問權限為「半公開」，則可以瀏覽此圖畫。
                    let result = check ? paintingId : false;                                // 依 check 取得結果
                    callback(null, result);
                });
            }
            // 若圖畫訪問權限不為「公開」，且使用者又沒登入，則回呼false。
            else {
                callback(null, false);
            }
        }
    );
}

/**
 * 透過畫作Id取得在「繪圖創作」頁面上所需要的畫作資料。
 * @param {string} paintingId 指定的畫作Id。
 * @param {CallbackFunction} 回呼函式。若成功找到，則將畫作資料回呼；若失敗則為null。
 */
PaintingSchema.statics.GetDrawingPageInfoById = function (paintingId, callback) {
    this.findOne({ "id": paintingId })
        .populate({ path: "activity", select: { "nthSeason": 1, "themeName": 1 } })
        .exec((err, paintingDocs) => {
            if (err) return callback(err, null);
            if (!paintingDocs) return callback(null, null);

            paintingDocs.paintingName = paintingDocs.name;      // 差值需求表定義之中，與Painting資料表唯一不一樣的地方。 paintingName: paintingDocs.name
            callback(null, paintingDocs);
        }
    );
}

/**
 * 判斷錯誤是否為「指定的畫作不存在」。
 * @return {boolean} 檢查的結果。
 */
PaintingSchema.statics.IsError_PaintingNotExist = function (error) {
    return error == Error_PaintingNotExist;
}

/**
 * 判斷錯誤是否為「畫作已被鎖定無法更改」。
 * @return {boolean} 檢查結果。
 */
PaintingSchema.statics.IsError_PaintingIsLocked = function (error) {
    return error == Error_PaintingIsLocked;
}

/**
 * 判斷錯誤是否為「畫作已完成無法做二次完成動作」
 * @return {boolean} 檢查結果。
 */
PaintingSchema.statics.IsError_PaintingHasFinished = function (error) {
    return error == Error_PaintingHasFinished;
}

/**
 * 取得「找不到指定畫作」的錯誤。
 * @return {Error} 錯誤 Error_PaintingNotExist 。
 */
PaintingSchema.statics.GetError_PaintingNotExist = function () {
    return Error_PaintingNotExist;
}

/**
 * 移除所有與圖畫有關聯的「留言(Comment)」、「評分(Rating)」與「參與活動(Participation)」
 * @param {CallbackFunction} callback 回呼函式。
 */
PaintingSchema.methods.RemoveAllReferenceInfo = function (callback) {
    Participation.remove({"_id": this.activity}, (err) => {
        if (err) return callback(err, null);

        Rating.remove({"_id": { $in: this.ratings } }, (err) => {
            if (err) return callback(err, null);

            Comment.remove({"_id": { $in: this.comments }}, (err) => {
                if (err) return callback(err, null);
                callback(null, true);
            });
        });
    });
}

/**
 * 尋找使用者(Username)對這幅畫作的評分。若沒有，則回傳0。
 * 注意，畫作資料必須要對ratings欄位做Populate之後，此函式執行才會有正確的結果。
 * @param {string} username 使用者名稱。
 * @return {number} 目標使用者的評分分數。
 */
PaintingSchema.methods.FindRatingScoreByUsername = function (username) {
    for (let rating of this.ratings) {
        if (rating.username == username)
            return rating.score;
    }
    return 0;
}

/**
 * 透過畫作Id尋找指定的畫作資料，將留言新增到其中。
 * @param {string} paintingId 指定的畫作Id。
 * @param {string} username 留言的使用者。
 * @param {string} userPhotoURL 留言使用者的個人圖像。
 * @param {string} comment 留言內容。
 * @param {CallbackFunction} callback 回呼函式。
 */
PaintingSchema.statics.PushNewComment = function (paintingId, username, userPhotoURL, comment, callback) {
    // 尋找目標畫作
    this.findOne({"id": paintingId}, "comments", (err, paintingDocs) => {
        if (err) return callback(err, null);
        if (!paintingDocs) return callback(Error_PaintingNotExist, null);

        // 定義留言資料
        let newComment = {
            username: username,
            photo: userPhotoURL,
            comment: comment,
            time: new Date()
        };

        // 新增留言
        Comment.createNewComment(newComment, (err, _id) => {
            if (err) return callback(err, null);

            // 將該項留言連結至目標畫作
            paintingDocs.comments.push(_id);
            paintingDocs.save((err) => {
                if (err)
                    callback(err, null);
                else
                    callback(null, _id);
            });
        });
    });
}

/**
 * 以使用者名稱(username)來尋找對應的評分(Rating)。
 * 注意，必須要先連結(Populate)過ratings欄位之後，才能使用此函式。
 * @param {string} username 目標使用者名稱。
 * @return {Rating?} 評分資料。
 */
PaintingSchema.methods.FindRatingByUsername = function (username) {
    for (let docs of this.ratings) {
        if (docs.username == username)
            return docs;
    }
    return null;
}

/**
 * 更新totalScore欄位。注意，必須要先連結(Populate)過ratings欄位之後，才能使用此函式。
 */
PaintingSchema.methods.UpdateTotalScore = function () {
    let sum = 0;
    for (let docs of this.ratings) {
        sum += docs.score;
    }
    this.totalScore = sum / this.ratings.length;
}

/**
 * 透過畫作Id尋找指定的畫作，將評分分數更新到其上。
 * @param {string} paintingId 指定的畫作Id。
 * @param {string} username 評分的使用者名稱。
 * @param {number} score 評分分數。
 * @param {CallbackFunction} callback 回呼函式。
 */
PaintingSchema.statics.UpdateRatingById = function (paintingId, username, score, callback) {
    // 以圖畫Id，尋找指定的畫作資料
    this.findOne({"id": paintingId})
        .select("ratings totalScore")
        .populate("ratings")
        .exec((err, paintingDocs) => {
            if (err) return callback(err, null);
            if (!paintingDocs) return callback(Error_PaintingNotExist, null);
            let datas = { username: username, score: score };       // Rating建立新資料
            
            // 檢查使用者在之前是否已有做過評分
            let ratingDocs = paintingDocs.FindRatingByUsername(username);

            // 若在先前已有評分過，則
            if (ratingDocs) {
                ratingDocs.score = score;           // 更新評分分數
                paintingDocs.UpdateTotalScore();    // 更新totalScore欄位

                // 儲存評分資料
                ratingDocs.save((err) => {
                    if (err) return callback(err, null);

                    // 儲存畫作資料
                    paintingDocs.save((err) => {
                        if (err) return callback(err, null);
                        callback(null, paintingDocs._id);
                    });
                });
            }
            else {
                // 創立一個新的評分
                Rating.createNewRating(datas, (err, ratingDocs) => {
                    if (err) return callback(err, null);
                    paintingDocs.ratings.push(ratingDocs);      // 將新的評分加入
                    paintingDocs.UpdateTotalScore();            // 更新總評分
                    
                    // 儲存畫作資料
                    paintingDocs.save((err) => {
                        if (err) return callback(err, null);
                        callback(null, paintingDocs._id);
                    });
                });
            }
        }
    );
}


module.exports = mongoose.model("Painting", PaintingSchema);