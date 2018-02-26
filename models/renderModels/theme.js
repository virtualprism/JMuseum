var Season = require("../mongooseSchemas/Season");
/**
 * 頁面「畫作主題」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function ThemeRender(renderData, route, session, callback) {
    // 先取得「畫作主題」頁面所需要的季資訊
    // 若出現錯誤，則回呼錯誤訊息；若取得成功，則回呼true已表示成功。
    Season.GetThemePageNeedInfo(function (err, seasonDatas) {
        if (err) {
            callback(err, null);
            return;
        }
        renderData.datas = seasonDatas;
        callback(null, true);
    });
}
module.exports.Render = ThemeRender;
