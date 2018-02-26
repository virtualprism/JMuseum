
const User : any = require("../mongooseSchemas/User");

/**
 *  由DataRender所定義的基本差值物件。這裡僅列出必要的datas屬性與會用到的屬性。
 */
interface BasicLayout {datas: any, hasLogin: boolean, username: string}

/**
 * A Callback function.
 * @callback CallbackFunction
 * @param {Object} err 錯誤資訊物件。
 * @param {Object} obj 成功時所回傳的物件。
 */
interface CallbackFunction { (err: Object, obj: Object) : void }

/**
 * 頁面「意見回饋」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function FeedBackRender(renderData: BasicLayout, callback: CallbackFunction) : void
{
    renderData.datas.currentDate = (new Date()).toLocaleDateString();
    // 如果使用者沒有登入，則設定hasPostFeedback為false，並呼叫回呼函式。
    if (!renderData.hasLogin) {
        renderData.datas.hasPostFeedback = false;
        callback(null, true);
        return;
    }
    // 如果使用者有登入，則尋找資料庫中指定的使用者資料的「hasPostFeedback」欄位。
    User.findOne({"username" : renderData.username}).select("hasPostFeedback").exec((err, property) => {
        if (err) {
            callback(err, null);
            return;
        }
        renderData.datas.hasPostFeedback = property;
        callback(null, true);
    });
}

module.exports.Render = FeedBackRender;