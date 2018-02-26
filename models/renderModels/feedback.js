var User = require("../mongooseSchemas/User");
/**
 * 頁面「意見回饋」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function FeedBackRender(renderData, route, session, callback) {
    renderData.datas.currentDate = (new Date()).toLocaleDateString();
    // 如果使用者沒有登入，則設定hasPostFeedback為false，並呼叫回呼函式。
    if (!renderData.hasLogin) {
        renderData.datas.hasPostFeedback = false;
        callback(null, true);
        return;
    }
    // 如果使用者有登入，則尋找資料庫中指定的使用者資料的「hasPostFeedback」欄位。
    User.findOne({ "username": renderData.username }).select("hasPostFeedback").exec(function (err, userDoc) {
        if (err) {
            callback(err, null);
            return;
        }
        renderData.datas.hasPostFeedback = userDoc.hasPostFeedback;
        callback(null, true);
    });
}
module.exports.Render = FeedBackRender;
