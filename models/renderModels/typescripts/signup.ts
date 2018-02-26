
/**
 *  由DataRender所定義的基本差值物件。這裡僅列出必要的datas屬性。
 */
interface BasicLayout {datas: any}

/**
 * A Callback function.
 * @callback CallbackFunction
 * @param {Object} err 錯誤資訊物件。
 * @param {Object} obj 成功時所回傳的物件。
 */
interface CallbackFunction { (err: Object, obj: Object) : void }

/**
 * 頁面「註冊」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function SignUpRender(renderData: BasicLayout, callback: CallbackFunction) : void
{
    // 登入頁面目前不需要做任何插值
    callback(null, true);
}

module.exports.Render = SignUpRender;