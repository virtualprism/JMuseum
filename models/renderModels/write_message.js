
let User = require("../mongooseSchemas/User");

/**
 * 以基本插值資料、路由路徑做資料源，設定在write_message頁面下該插入什麼資料值。
 * @param {BasicLayout} renderData 插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function WriteMessageRender(renderData, route, session, callback) {
    let populateQuery = { path: "friendList", select: { "username": 1 } };  // 建立Populate Query，連結好友清單中的「Username」欄位。
    let recipient = route.substr(15);                                       // 取得指定的使用者

    // 尋找目前使用者的好友清單內的所有好友的使用者名稱
    User.findOne({"username": renderData.username})
        .populate(populateQuery)
        .exec((err, docs) => {
            // 若有錯誤，則將錯誤回呼並返回
            if (err) return callback(err);

            // 將收件者加入插值物件中
            renderData.datas.recipient = recipient;

            // 循環取得好友清單所有的使用者名稱
            let friendsUsernames = [];
            for (let friend of docs.friendList)
                friendsUsernames.push(friend.username);
            renderData.datas.friendList = friendsUsernames;
            callback(null, true);
        }
    );
}

module.exports.Render = WriteMessageRender;