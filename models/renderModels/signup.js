/**
 * 頁面「註冊」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function SignUpRender(renderData, route, session, callback) {
    // 登入頁面目前不需要做任何插值
    callback(null, true);
}
module.exports.Render = SignUpRender;
