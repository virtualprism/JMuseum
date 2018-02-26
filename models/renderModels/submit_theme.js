
/**
 * 以基本插值資料、路由路徑做資料源，設定在submit_theme頁面下該插入什麼資料值。
 * @param {BasicLayout} renderData 插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function SubmitThemeRender(renderData, route, session, callback) {
    // 此頁面不需要任何插值資料
    callback(null, true);
}

module.exports.Render = SubmitThemeRender;