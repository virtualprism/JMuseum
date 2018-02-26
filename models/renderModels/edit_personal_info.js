
const User = require("../mongooseSchemas/User");

/**
 * 頁面「編輯個人資料」的插值函式。
 * @param {BasicLayout} renderData 插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function EditPersonalInfoRender(renderData, route, session, callback) {
    User.findOne({"username": renderData.username})
        .exec((err, userDocs) => {
            if (err) return callback(err, null);
            if (userDocs) {
                renderData.datas = userDocs.personalInfo;
                callback(null, true);
            }
            else {
                callback(User.Error_UserNotExist(), null);
            }
        }
    );
}

module.exports.Render = EditPersonalInfoRender;