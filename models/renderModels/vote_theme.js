
const NewTheme = require("../mongooseSchemas/NewTheme");
const ServerStatus = require("../../ServerStatus");

/**
 * 以基本插值資料、路由路徑做資料源，設定在write_message頁面下該插入什麼資料值。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function VoteThemeRenderer(renderData, route, session, callback) {
    let status = ServerStatus.status;       // 取得伺服器的狀態資料
    let datas = renderData.datas;

    datas.title = "第" + (status.currentSeason + 1) + "季主題票選";
    datas.voteCount = status.voteCount;                     // 取得在主題候選之中，使用者的手中有多少票
    
    // 將候選主題全部找出，並依建立時間來進行排列
    NewTheme.find({})
        .sort({ "createdTime": 1 })
        .exec((err, newThemeDocs) => {
            if (err) return callback(err, null);
            
            // 將所有頁面所要的候選主題資料加入到 themes 中
            let themes = [];
            newThemeDocs.forEach((docs, index) => {
                themes.push({
                    id: index,
                    title: docs.title,
                    narrative: docs.narrative,
                    imageURL: docs.image,
                    originator: docs.sponsor
                });
            });

            // 隨後再將 themes 加入到 datas 之上
            datas.themes = themes;
            callback(null, true);
        }
    );
}

module.exports.Render = VoteThemeRenderer;