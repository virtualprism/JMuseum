const fileSystem = require("fs");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const SiteMail = require("../mongooseSchemas/SiteMail");
const ServerStatus = require("../../ServerStatus");

const Painting = require("./Painting");
const Schema = mongoose.Schema;

const saltNumber = 8;     // 在進行雜湊之前，將要被雜湊的資料「加鹽」，其中長度固定為8。

const Error_ExistSameUsername = new Error("已有存在相同使用者名稱。");
const Error_ExistSameEmail    = new Error("已有存在相同電子郵件。");
const Error_UserNotExist      = new Error("目標使用者不存在。");
const Error_IlligelPhotoImageFormat = new Error("錯誤的影像檔案格式。");

/**
 * 定義在「使用者」資料表中，儲存「個人資訊」的子資料表。
 * @prop {String} email 使用者的電子郵件信箱。
 * @prop {String} lastName 使用者的姓。
 * @prop {String} firstName 使用者的名。
 * @prop {String} nickName 使用者的暱稱。
 * @prop {String} motto 使用者的個人短語。
 * @prop {String} photo 使用者的照片。儲存形式為URL。
 */
let PersonalInfo = Schema({
    email : String,
    lastName : String,
    firstName : String,
    nickname : String,
    motto : String,
    photo : String,         // URL 
});

/** 
 * 定義在「使用者」資料表中，儲存「主頁訊息」的子資料表。
 * @prop {Boolean} isServerMessage 是否為伺服廣播訊息。
 * @prop {String?} title 訊息標題。在isServerMessage = true時，此項為空。
 * @prop {String?} content 訊息內容。在isServerMessage = true時，此項為空．
 * @prop {ObjectId} refId 訊息參考_id。當isServerMessage = false時，此項會連接到一個假的伺服訊息。
 * @prop {Date} postTime 輸出此訊息時的時間日期。
 * @prop {Boolean} isSeen 此訊息是否已被使用者讀過了。
 * @prop {Boolean} isPrivate 訊息是否僅能被使用者看見。
 */
let SiteMessage = Schema({
    isServerMessage: Boolean,
    title: String,
    content: String,
    refId: {type: Schema.Types.ObjectId, ref: "ServerMessage"},
    postTime: {type: Schema.Types.Date, default: Date.now },
    isSeen: {type: Schema.Types.Boolean, default: false},
    isPrivate: Boolean
});

/**
 * 定義「使用者」資料表。
 * @prop {String} username 使用者的名稱。
 * @prop {String} password 使用者的密碼。以雜湊的方式來儲存。
 * @prop {PersonalInfo} personalInfo 使用者的個人資料。
 * @prop {String[]} tags 使用者所定義的標籤。
 * @prop {ObjectId[] -> Painting} paintings 儲存使用者的作畫資料。以連結的方式儲存。
 * @prop {SiteMessage[]} siteMsg 站內訊息。以連結的方式儲存。
 * @prop {ObjectId[] -> SiteMail} siteMail 站內信。以連結的方式儲存。
 * @prop {Number} notices 通知數。表示使用者未讀的站內訊息數量。
 * @prop {ObjectId[] -> User} friendList 好友清單。以連結的方式儲存。
 * @prop {Boolean} autoSaveEnable 選項。是否在作畫的時候自動儲存。
 * @prop {Boolean} hasPostFeedback 表示此使用者是否有在這個月內回饋。
 * @prop {Boolean} hasPostNewTheme 表示使用者是否有投稿過新主題。
 * @prop {Boolean} hasVotedNewTheme 表示使用者是否有為新主題投過票。
 */
let UserSchema = Schema({
    id : String,
    username : String,
    password : String,
    personalInfo : PersonalInfo,
    tags : [{type: String}],
    paintings : [{type : Schema.Types.ObjectId, ref : "Painting"}],
    siteMsg : [{type: SiteMessage}],
    siteMail : [{type : Schema.Types.ObjectId, ref : "SiteMail"}],
    notices : Number,
    friendList : [{type : Schema.Types.ObjectId, ref : "User"}],
    autoSaveEnable : Boolean,
    hasPostFeedback : Boolean,
    hasPostNewTheme : Boolean,
    hasVotedNewTheme : Boolean
});

/**
 * @typedef NewUserDataSet
 * @prop {String} lastName  新使用者的「姓」字串資料。
 * @prop {String} firstName 新使用者的「名」字串資料。
 * @prop {String} email     新使用者的「Email」字串資料。
 * @prop {String} username  新使用者的「使用者名稱」字串資料。
 * @prop {String} password  新使用者的「密碼」字串資料。
 * @prop {String?} confirmPassword 新使用者的「確認密碼」字串資料。
 */
/**
 * 以輸入的資料，建立新的使用者資料。
 * @param {NewUserDataSet} data 紀錄要新增使用者的來源資料．
 * @param {CallbackFunction} 回呼函式。決定資料儲存是否成功或發生錯誤。
 */
UserSchema.statics.createNewUser = function (data, callback) {
    let _User = this;
    // 檢查輸入的使用者名稱與信箱是否與現存使用者的相衝
    this.findOne({ $or: [{"username": data.username}, {"personalInfo.email": data.email}]})
        .exec((err, user) => {
            if (err) {  // 如果發生錯誤，則回傳錯誤訊息
                callback(err, null);
                return;
            }           // 若有找到相符的信箱或名稱，則回呼錯誤訊息
            else if (user) {
                if (user.username == data.username) {
                    callback(Error_ExistSameUsername, null);
                }
                else {
                    callback(Error_ExistSameEmail, null);
                }
                return;
            }
            // 若欲新增的使用者不存在，則可以新增。首先，先對密碼做加密動作。
            bcrypt.hash(data.password, saltNumber, (err, hash) => {
                // 若密碼雜湊過程有錯誤，則直接回呼。
                if (err) {
                    callback(err, null);
                    return;
                }
                // 以自身(模組)建立一個新的資料
                let newUser = _User({
                    username : data.username,
                    password : hash,
                    personalInfo : {
                        email : data.email,
                        lastName : data.lastName,
                        firstName : data.firstName,
                        nickname : "",
                        motto : "",
                        photo : "/sample/Example.png"
                    },
                    tags : [],
                    paintings : [],
                    siteMsg : [{
                        isServerMessage: false,
                        refId: ServerStatus.status.welcomeServMsgId,
                        postTime: new Date(),
                        isSeen: false,
                        isPrivate: false
                    }],
                    siteMail : [],
                    notices : 0,
                    friendList : [],
                    autoSaveEnable : true,
                    hasPostFeedback : false,
                    hasPostNewTheme: false,
                    hasVotedNewTheme: false
                });
                // 將新建立的使用者資料儲存。並回呼結果。
                newUser.save(callback);
            });
        }
    );
};

/**
 * 判斷「相同使用者名稱」錯誤物件。
 * @param {Error} error 要判斷的錯誤物件。
 * @return {Boolean} 回傳布林值，判斷錯誤是否為「相同使用者名稱或信箱」。
 */
UserSchema.statics.IsExistSameUsername = function (error) {
    return error === Error_ExistSameUsername;
}

/**
 * 判斷「相同信箱」錯誤物件。
 * @param {Error} error 要判斷的錯誤物件。
 * @return {Boolean} 回傳布林值，判斷錯誤是否為「相同使用者名稱或信箱」。
 */
UserSchema.statics.IsExistSameEmail = function (error) {
    return error === Error_ExistSameEmail;
}

/**
 * 判斷「使用者不存在」錯誤物件。
 * @param {Error} error 要判斷的錯誤訊息物件。
 * @return {Boolean} 回傳布林值，判斷錯誤是否為「目標使用者不存在。」。
 */
UserSchema.statics.IsUserNotExist = function (error) {
    return error === Error_UserNotExist;
}

/**
 * 取得「使用者不存在」錯誤物件。
 * @return {Error} 回傳「使用者不存在」錯誤物件。
 */
UserSchema.statics.Error_UserNotExist = function () {
    return Error_UserNotExist;
};

/**
 * 比對登入的帳號與密碼。
 * @param {String} username 使用者名稱。
 * @param {String} password 要進行比對的密碼。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.AccountComparison = function (username, password, callback) {
    // 尋找指定的使用者帳號是否存在
    this.findOne({"username" : username})
        .exec((err, user) => {
            if (err) {
                callback(err, null);
                return;
            }
            if (!user) {
                callback(null, false);
                return;
            }
            // 比對輸入的帳號與儲存於資料庫中的密碼雜湊
            bcrypt.compare(password, user.password, (err, result) => {
                if (result)
                    callback(err, user);
                else
                    callback(err, false);
            });
        }
    );
}

/**
 * 以傳入的資料庫識別ID來尋找指定使用者資料，將需要的基本訊息(使用者名稱、通知數)設定至標準插值物件上。
 * @param {String?} user_Id 為資料庫中的識別Id，用來尋找使用者資料所用。若此項不存在則直接回呼。
 * @param {BasicLayout} dataObject 基本插值物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.SetBasicInformation = function (user_Id, dataObject, callback) {
    // 若傳入的 user_Id 不為空，則嘗試尋找該目標使用者並取得需要的基本插值資料
    if (user_Id) {
        // 以 user_Id 取得目標使用者資料。
        this.findOne({_id: user_Id})
            .exec((err, user) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                if (!user) {
                    callback(Error_UserNotExist, null);
                    return;
                }
                // 若資料庫存取無錯誤、有找到目標使用者，則將使用者名稱與通知數的資訊，加入到基本插值物件中。
                dataObject.username = user.username;
                dataObject.notices = user.notices;
                callback(null, dataObject);
            }
        );
    }
    // 如果 user_Id 為空的話，則直接回呼。
    else {
        callback(null, dataObject);
    }
}

/**
 * 嘗試以傳入的_id來去尋找目標使用者資料，若目標資料中的使用者名稱與參數username一樣，則回呼true；否則false。
 * @param {string} user_Id 目標要尋找的使用者的_id。
 * @param {string} username 要比對的使用者名稱。
 * @param {CallbackFunction} callback 回呼函式。回傳錯誤訊息或結果。
 */
UserSchema.statics.CheckUsernameBy_Id = function (user_Id, username, callback) {
    // 以 user_Id 來尋找目標使用者。
    this.findOne({"_id": user_Id})
        .exec((err, user) => {
            // 若資料庫有發生錯誤則直接將錯誤回呼。
            if (err) return callback(err, null);

            // 若使用者存在，則回呼比較結果。
            if (user) {
                return callback(null, user.username == username);
            }
            // 若不存在，則回呼「使用者不存在」錯誤。
            else {
                return callback(Error_UserNotExist, null);
            }
        }
    );
}

/**
 * 更新個人資料。
 * 更新完資料，若無問題則回呼callback(null, true)；若有錯誤，則回呼callback(err, false)。
 * @param {string} user_id 對應至使用者資料的 ObjectId 字串。 
 * @param {PersonalInfo} textDatas 存放姓、名、暱稱、短言的物件。
 * @param {Multer.FileInfo?} photoInfo 使用者傳送至伺服端的初始影像檔案。若此項為null，則不更新圖像資料。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.UpdatePersonalInfo = function (user_id, textDatas, photoInfo, callback) {
    // 先尋找目標使用者的資料
    this.findOne({ "_id": user_id })
        .exec((err, userDocs) => {
            // 若資料庫尋找時出現錯誤，將其錯誤資料回呼
            if (err) return callback(err, null);

            // 若找不到使用者時，將「使用者不存在」回呼。
            if (!userDocs) return callback(Error_UserNotExist, null);

            // 更新文字部分的個人資料
            userDocs.personalInfo.lastName = textDatas.lastName;
            userDocs.personalInfo.firstName = textDatas.firstName;
            userDocs.personalInfo.nickname = textDatas.nickname;
            userDocs.personalInfo.motto = textDatas.motto;

            // 若有圖像資訊，表示使用者上傳了新的圖像，需要對此資料項更新
            if (photoInfo) {
                
                let fileName = userDocs.username + (photoInfo.mimetype == "image/jpeg" ? ".jpg" : ".png");  // 定義新圖檔名稱
                let publicPath = "/images/user_photos/" + fileName;                                         // 外部、瀏覽器端可看得到的路徑
                let dstFilePath = "public" + publicPath;                                                    // 複製檔案的目的路徑

                // 將暫存的圖片檔案複製到指定的位置
                fileSystem.copyFile(photoInfo.path, dstFilePath, (err) => {
                    // 若發生錯誤，則將錯誤回呼
                    if (err) return callback(err, null);
                    
                    // 更新個人頭像路徑
                    userDocs.personalInfo.photo = publicPath;

                    // 將暫存的圖片刪除
                    fileSystem.unlink(photoInfo.path, (err) => { if (err) console.log(err); });

                    // 儲存更變後的個人資料
                    userDocs.save((err) => {
                        // 若發生錯誤，則將錯誤回呼
                        if (err) return callback(err, null);
                        // 若無，則回呼 callback(null, true) 以表示完成
                        callback(null, true);
                    });
                });
            }
            // 若無，則直接儲存資料
            else {
                // 儲存更變後的個人資料
                userDocs.save((err) => {
                    // 若發生錯誤，則將錯誤回呼
                    if (err) return callback(err, null);
                    // 若無，則回呼 callback(null, true) 以表示完成
                    callback(null, true);
                });
            }
        })
    ;
}

/**
 * 傳入使用者名稱，檢查該名使用者是否存在於資料庫中。
 * 若存在，則回呼 true ；若否，則回呼 false。
 * @param {string} username 欲查詢的使用者名稱。
 * @param {CallbackFucntion} callback 回呼函式。
 */
UserSchema.statics.CheckUserIsExistByUsername = function (username, callback) {
    this.findOne({"username": username})
        .exec((err, docs) => {
            if (err) return callback(err, null);
            callback(null, docs !== null && docs !== undefined);
        }
    );
}

/**
 * @typedef {Object} MailData 信件資料。
 * @prop {string} recipient 收件者的使用者名稱。
 * @prop {string} subject 信件的主旨。
 * @prop {string} content 信件的內容。
 * @prop {Boolean} isPrivate 表示此信件是否為「私人觀看」的。
 */
/**
 * 使用者sender傳送站內訊息給目標使用者。
 * @param {string} sender 寄件者的使用者_id。
 * @param {MailData} mailInfo 信件內容。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.SendSiteMail = function (sender_id, mailInfo, callback) {
    // 檢測目標收件者是否存在
    this.findOne({"username": mailInfo.recipient}).exec((err, recipientDocs) => {
        if (err) return callback(err, null);                            // 若資料庫有錯誤，則直接回呼
        if (!recipientDocs) return callback(Error_UserNotExist, null);  // 若找不到收件者，則回呼「目標使用者不存在。」錯誤。

        // 尋找寄件者的使用者名稱
        this.findOne({"_id": sender_id}).select("username").exec((err, senderDocs) => {
            if (err) return callback(err, null);                        // 若資料庫有錯誤，則直接回呼

            // 建立SiteMail資料
            let data = {
                title: mailInfo.subject,
                content: mailInfo.content,
                sender: senderDocs.username,
                isPrivate: mailInfo.isPrivate,
                sendTime: new Date()
            }

            // 建立站內信，並將其站內信連接到收件者的siteMail中
            SiteMail.createNewSiteMail(data, (err, _id) => {
                if (err) return callback(err, null);    // 若資料庫有錯誤，則直接回呼
                recipientDocs.siteMail.push(_id);       // 將新增的站內信的_id，加入到收件者的siteMail中。

                // 也許多新增一下站內訊息?

                // 儲存更動結果
                recipientDocs.save((err) => {
                    if (err) return callback(err, null);    // 若資料庫有錯誤，則直接回呼
                    callback(null, true);
                });
            });
        });
    });
    
}

/**
 * 更變指定使用者的密碼。先驗證舊有密碼，若成功則更新密碼。
 * @param {string} _id 要更改使用者密碼的目標使用者的_id。
 * @param {string} old_password 使用者輸入的舊密碼。
 * @param {string} new_password 使用者輸入的新密碼。
 * @param {CallbackFunction} callback 回呼函式。若輸入的舊密碼與新密碼不相符，則回呼false；若相符且成功更改，則回呼true。
 */
UserSchema.statics.ChangePassword = function (_id, old_password, new_password, callback) {
    // 以_id尋找指定的使用者資料
    this.findOne({"_id": _id}).exec((err, userDocs) => {
        if (err) return callback(err, null);
        if (!userDocs) return callback(Error_UserNotExist, null);

        // 比對舊密碼，若result = true表示正確，則繼續更新密碼動作；反之，則回呼false。
        bcrypt.compare(old_password ,userDocs.password, (err, result) => {
            if (err) return callback(err, null);
            if (!result) return callback(null, false);

            // 對新密碼做雜湊演算，取得雜湊後的密碼
            bcrypt.hash(new_password, saltNumber, (err, hashedPW) => {
                userDocs.password = hashedPW;   // 更新密碼

                // 將更動過後的使用者資料儲存
                userDocs.save((err) => {
                    if (err) return callback(err, null);

                    // 回呼 true，表示成功
                    callback(null, true);
                });
            })
        });
    });
}

/**
 * 確認傳入的標籤清單中所有的標籤，是否皆在使用者定義的標籤清單之中。
 * @param {string} user_id 目標使用者的_id。
 * @param {string[]} tagsList 要進行檢查的目標標籤清單。
 * @param {CallbackFunction} callback 回呼函式。若驗證成功則回呼true；反之則false。
 */
UserSchema.statics.IsInUsersTagsList = function (user_id, tagsList, callback) {
    this.findOne({"_id": user_id}).exec((err, userDocs) => {
        if (err) return callback(err, null);
        if (!userDocs) return callback(Error_UserNotExist, null);
        if (tagsList === null || tagsList == undefined) return callback(null, false);

        // 檢查tagsList中所有的標籤是否皆在使用者定義的標籤之中。
        for (let tag of tagsList) {
            // 若其中一個標前不在使用者的定義之中時，則回呼false。
            if (userDocs.tags.indexOf(tag) < 0)
                return callback(null, false);
        }

        // 經檢查後，若皆在定義之中，則回呼true。
        callback(null, true);
    });
}

/**
 * 確認傳入的標籤清單中所有的標籤，是否接載使用者定義的標籤清單中。
 * @param {string[]} tagsList 要進行檢查的目標標籤清單。
 * @return {boolean} 是否皆在使用者定義的標籤清單中。
 */
UserSchema.methods.IsInTagsList = function (tagsList) {
    let tagsByUser = this.tags;
    // 檢查tagsList中所有的標籤是否皆在使用者定義的標籤之中。
    for (let tag of tagsList) {
        // 若其中一個標前不在使用者的定義之中時，則回呼false。
        if (tagsByUser.indexOf(tag) < 0)
            return false;
    }
    return true;
}

/**
 * 確認這個畫作是否為此使用者所擁有。
 * @param {string} paintingId 欲檢查的畫作的id (為UUID)。
 * @return {boolean} 代表檢查的畫作是否為使用者擁有。
 */
UserSchema.methods.IsPaintingsOwner = function (paintingId) {
    let usersPaintings = this.paintings;
    for (let painting of usersPaintings) {
        if (painting.id === paintingId)
            return true;
    }
    return false;
}

/**
 * 嘗試以畫作Id取得使用者的畫作資料。
 * 
 * @param {string} 畫作Id。
 * @return {Painting?} 目標畫作的資料。若找不到畫作則回傳null。
 */
UserSchema.methods.GetPaintingById = function (paintingId) {
    for (let painting of this.paintings) {
        if (painting.id == paintingId)
            return painting;
    }
    return null;
}

/**
 * 檢查圖畫ID(paintingId)是否為目標使用者(user_id)所擁有。
 * 若擁有，則回呼paintingId；若否，則回呼false。
 * @param {string} paintingId 要檢查的圖畫的Id。
 * @param {string} user_id 目標使用者的_id。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.CheckPaintingId = function (paintingId, user_id, callback) {
    this.findOne({"_id": user_id})
        .populate({ path: "paintings", select: { "id": 1 } })
        .exec((err, userDocs) => {
            if (err) return callback(err, null);
            if (userDocs.IsPaintingsOwner(paintingId)) {
                callback(null, paintingId);
            }
            else {
                callback(null, false);
            }
        }
    );
}

/**
 * 查詢目標使用者(user_id)是否為此使用者的好友。
 * @param {string} user_id 目標使用者的_id。
 * @return {boolean} 是否為使用者的好友。
 */
UserSchema.methods.IsUsersFriend = function (user_id) {
    let list = this.friendList;
    for (let _id of list) {
        if (_id.equals(user_id))
            return true;
    }
    return false;
}

/**
 * 對所有的使用者做訊息廣播。
 * @param {string} servMsg_id 目標的伺服器訊息的_id．
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.BroadcastServerMessage = function (servMsg_id, callback) {
    // 建立站內資料
    let newSiteMsg = { 
        isServerMessage: true,
        refId: servMsg_id,
        postTime: new Date(),
        isSeen: false,
        isPrivate: false
    };
    // 取得每一個使用者的資料，並選取其中的notices與siteMsg欄位
    this.find({}, "notices siteMsg", (err, userDocs) => {
        if (err) return callback(err, null);
        
        // 循每一位使用者，將新的站內訊息資料加入到使用者資料中
        let index = -1, length = userDocs.length;
        function SaveUserDocs(err) {
            if (err) return callback(err, null);
            index += 1;
            // 若尚未儲存完畢，也就是還未到最後一個時，則繼續儲存
            if (index < length) {
                userDocs[index].notices += 1;
                userDocs[index].siteMsg.push(newSiteMsg);
                userDocs[index].save(SaveUserDocs);
            }
            // 若已完成則回呼
            else {
                callback(null, true);
            }
        }
        // 回呼式地做更改、儲存的動作。
        SaveUserDocs(false);
    });
}

/**
 * 以指定的標題、內容、隱私設定來獨立新增一個站內訊息。
 * @param {string} title 訊息的標題。
 * @param {string} content 訊息的內容。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.methods.AddNewSiteMessage = function (title, content, isPrivate) {
    this.siteMsg.push({
        isServerMessage: false,
        title: title,
        content: content,
        refId: null,
        postTime: new Date(),
        isSeen: false,
        isPrivate: isPrivate
    });
}

/**
 * 將所有使用者的「hasPostNewTheme」欄位設定為false。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.Refresh_HasPostNewTheme = function (callback) {
    // 嘗試將所有使用者資料中的 hasPostNewTheme 欄位更新成 false。
    this.updateMany({}, { $set: { "hasPostNewTheme": false } }, callback);
}

/**
 * 將所也使用者的「hasVotedNewTheme」欄位設定為false。
 * @param {CallbackFunction} callback 回呼函式。
 */
UserSchema.statics.Refresh_HasVotedNewTheme = function (callback) {
    // 嘗試將所有使用者資料中的 hasVotedNewTheme 欄位更新成 false。
    this.updateMany({}, { $set: { "hasVotedNewTheme": false } }, callback);
}

module.exports = mongoose.model("User", UserSchema);

// 交叉引入下，替Painting引入User。
Painting.crossInitByUser();