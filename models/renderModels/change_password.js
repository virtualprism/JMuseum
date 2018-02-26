
const User = require("../mongooseSchemas/User");

/**
 * 頁面「更變密碼」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function ChangePasswordRender(renderData, route, session, callback) {
    // 頁面「更變密碼」不需要任何插值。
    callback(null, true);
}

module.exports.Render = ChangePasswordRender;