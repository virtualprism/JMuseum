
const User = require("./mongooseSchemas/User");   // 引入「使用者 (User)」資料庫表。

/**
 * A Callback function.
 * @callback CallbackFunction
 * @param {Object} err 錯誤資訊物件。
 * @param {Object} obj 成功時所回傳的物件。
 */
interface CallbackFunction { (err: Object, obj: Object) : void }

/**
 * Standard data render layout
 */
interface BasicLayout {
    /** 紀錄使用者目前在哪個頁面上。 */
    source : string,

    /** 延伸的CSS檔案名稱。 */
    extendedStyle : string,

    /** 網頁的標題名稱。 */
    title : string,

    /** 紀錄使用者是否登入網站。 */
    hasLogin : boolean,

    /** 使用者的名稱。 */
    username : string,

    /** 使用者的通知數。 */
    notices : number,

    /** 放置主要資料的物件。 */
    datas : any,

    /** 是否有「投稿主題」的活動、頁面在進行。 */
    haveSubmitThemeEvent : boolean,

    /** 是否有「投票主題」的活動、頁面在進行。 */
    haveVoteThemeEvent : boolean
}

/**
 * 插值來源對應表。可以迅速的比對使用者要求的頁面需要什麼樣的插值。
 */
const renderList =
{
    "index" : require("./renderModels/index"),
    "gallery" : require("./renderModels/gallery"),
    "theme": require("./renderModels/theme"),
    "feedback": require("./renderModels/feedback"),
    "login": require("./renderModels/login"),
    "signup": require("./renderModels/signup")
};

/**
 * 轉跳頁面、訊息頁面所用的插值，比起renderList中的差值，這有較大的靈活性。
 */
const messageRender = require("./renderModels/message_form");

/** 
 * 插值資料給予者。
 * 依照使用者所給的路由位置，此函式就會回傳相對應的插值物件。
 * @param {string} source 頁面的模板來源名稱(Pug Template)。
 * @param {string} route 路由路徑。
 * @param {any} session Express 的 Session物件。
 * @param {CallbackFunction} callback 回呼函式。傳回錯誤訊息與插值資料。
 */
function DataRender(source: string, route : string, session : any, callback : CallbackFunction) : void
{
    // 檢查Session中是否有passport欄位，若有，則嘗試取得user(資料庫中的_id)；若無，則設為null。
    let _id = session.passport ? session.passport.user : null;
    // 建構 dataObject 物件
    let dataObject : BasicLayout = {
        source : source,
        extendedStyle : source + "_extended.css",
        title : route,
        hasLogin : (_id !== undefined && _id !== null),
        username : null,
        notices : null,
        datas : {},
        haveSubmitThemeEvent : false,
        haveVoteThemeEvent : false
    };
    // 嘗試取得資料來設定與目標使用者有關的基本資料(Username與通知數)
    User.SetBasicInformation(_id, dataObject, (err, dataObject) => {
        // 透過route來取得該頁面的插值資料，也就是設定 dataObject.datas 內容。
        renderList[source].Render(dataObject, (err, isSuccess) => {
            if (err)
                callback(err, null);
            else
                callback(null, dataObject);
        });
    });
}

module.exports.DataRender = DataRender;