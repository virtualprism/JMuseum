const User = require("./mongooseSchemas/User"); // 引入「使用者 (User)」資料庫表。

const ServerStatus = require("../ServerStatus");

/**
 * 插值來源對應表。可以迅速的比對使用者要求的頁面需要什麼樣的插值。
 */
const renderList = {
    "index": require("./renderModels/index"),
    "gallery": require("./renderModels/gallery"),
    "theme": require("./renderModels/theme"),
    "feedback": require("./renderModels/feedback"),
    "login": require("./renderModels/login"),
    "signup": require("./renderModels/signup"),
    "message_form": require("./renderModels/message_form"),
    "personal_page": require("./renderModels/personal_page"),
    "edit_personal_info": require("./renderModels/edit_personal_info"),
    "write_message": require("./renderModels/write_message"),
    "change_password": require("./renderModels/change_password"),
    "drawing": require("./renderModels/drawing"),
    "showcase": require("./renderModels/showcase"),
    "submit_theme": require("./renderModels/submit_theme"),
    "vote_theme": require("./renderModels/vote_theme")
};

/** 
 * 插值資料給予者。
 * 依照使用者所給的路由位置，此函式就會回傳相對應的插值物件。
 * @param {string} source 頁面的模板來源名稱(Pug Template)。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express 的 Session物件。
 * @param {CallbackFunction} callback 回呼函式。傳回錯誤訊息與插值資料。
 */
function DataRender(source, route, session, callback) {
    // 檢查Session中是否有passport欄位，若有，則嘗試取得user(資料庫中的_id)；若無，則設為null。
    let _id = session.passport ? session.passport.user : null;
    // 建構 dataObject 物件
    let dataObject = {
        source: source,
        extendedStyle: source + "_extended.css",
        title: route,
        hasLogin: (_id !== undefined && _id !== null),
        username: null,
        notices: null,
        datas: {},
        haveSubmitThemeEvent: ServerStatus.status.submitThemeEvent,
        haveVoteThemeEvent: ServerStatus.status.voteThemeEvent
    };
    // 嘗試取得資料來設定與目標使用者有關的基本資料(Username與通知數)
    User.SetBasicInformation(_id, dataObject, function (err, dataObject) {
        // 若該路由有在清單中，則透過指定的插值方法來為dataObject加入其所需要的資料
        if (source in renderList) {
            // 透過source來取得該頁面的插值資料，也就是設定 dataObject.datas 內容。
            renderList[source].Render(dataObject, route, session, function (err, isSuccess) {
                if (err)
                    callback(err, null);
                else
                    callback(null, dataObject);
            });
        }
        // 若不包含在清單中的，則視為例外
        else {
            callback(new Error("找不到對應的插值物件或Pug模板。"), null);
        }
    });
}

module.exports.DataRender = DataRender;
