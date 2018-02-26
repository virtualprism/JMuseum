
const User = require("../mongooseSchemas/User");
const Painting = require("../mongooseSchemas/Painting");
const SiteMail = require("../mongooseSchemas/SiteMail");

/**
 * 取得「個人頁面」的插值資料。
 * @param {BasicLayout} renderData 插值物件。 
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。 
 */
function PersonalPageRender(renderData, route, session, callback) {
    let paramUsername = route.substr(6);    // 取得路徑中所選的目標個人頁面的使用者名稱

    // 初步地檢查是否為合法的使用者名稱長度。若是，則進一步地去查詢相關資料
    if (4 <= paramUsername.length && paramUsername.length <= 16) {
        // 定義Populate Query : 套用的有paintings, siteMsg, siteMail 與 friendList
        let populateQuery = [
            { path: "paintings", select: { "id": 1, "name": 1, "links": 1, "description": 1, "viewAuthority": 1, "tags": 1 } },
            { path: "friendList", select: { "username": 1 } },
            { path: "siteMsg.refId" },
            { path: "siteMail" }
        ];

        // 嘗試尋找指定的使用者，並做populate來取得相關連的資料
        User.findOne({"username": paramUsername})
            .populate(populateQuery)
            .exec((err, userDocs) => {
                // 如果找到使用者的話，將需要的資料填入插值物件中
                if (userDocs) {
                    // 定義 datas 物件，並將一些不需要過濾的資料先加入
                    let datas = {
                        isOwner: (renderData.username == userDocs.username),    // 若目前正瀏覽的使用者與目標使用者的相同，則為這個個人頁面的擁有者(true)，反之為否(false)
                        username: userDocs.username,                // 使用者名稱
                        nickname: userDocs.personalInfo.nickname,   // 暱稱
                        motto: userDocs.personalInfo.motto,         // 短言
                        userPhotoURL: userDocs.personalInfo.photo,  // 個人相片 (連結路徑)
                        autoSaveEnable: userDocs.autoSaveEnable,    // 自動儲存
                        userTags: userDocs.tags,                    // 作品標籤
                        friendList: [],                             // 好友清單
                        siteMsg: [],                                // 網站訊息
                        paintings: [],                              // 作品集
                        siteMail: null                              // 站內信
                    };
                    
                    // 循環將 friendList 加入 datas 中
                    for (let i = 0, list = userDocs.friendList; i < list.length; i++)
                        datas.friendList.push(list[i].username);

                    // 循環將 siteMail 加入 datas 中
                    for (let list = userDocs.siteMsg, i = list.length - 1; i >= 0; i--) {
                        // 若為伺服訊息，則引用連接的伺服訊息資料
                        if (list[i].isServerMessage) {
                            datas.siteMsg.push({ title: list[i].refId.title, content: list[i].refId.content });
                        }
                        else {
                            datas.siteMsg.push({ title: list[i].title, content: list[i].content });
                        }
                    }

                    datas.siteMail = userDocs.siteMail;     // 將 siteMail 加入 datas 中

                    // 循環將 paintings 加入 datas 中
                    let isFriend = userDocs.IsUsersFriend(session.passport.user);       // 取得目前使用者對目標使用者而言的權限
                    for (let i = 0, list = userDocs.paintings; i < list.length; i++) {
                        // 若 觀看權限為「公開」 或 使用者為目標使用者的朋友且觀看權限為「半公開」 或 該使用者即為擁有者，則將幅畫資訊加入
                        if (list[i].viewAuthority == 0 || isFriend && list[i].viewAuthority == 1 || datas.isOwner) {
                            datas.paintings.push(list[i]);
                        }
                    }

                    renderData.datas = datas;   // 最後將 datas 複寫至 renderData.datas
                    callback(null, true);
                }
                // 若沒有找到，則將錯誤「找不到目標使用者」回呼至上層路由
                else {
                    callback(User.Error_UserNotExist(), null);
                }
            }
        );
    }
    // 如果不為合法的使用者名稱長度，則將錯誤「找不到目標使用者」回呼至上層路由。
    else {
        callback(User.Error_UserNotExist(), null);
    }
}

module.exports.Render = PersonalPageRender;