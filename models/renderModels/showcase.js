
const User = require("../mongooseSchemas/User");
const Painting = require("../mongooseSchemas/Painting");
const ParticipantInfo = require("../mongooseSchemas/ParticipantInfo");

/**
 * 以主使用者與被檢查的使用者之間的關係，取得觀看權限數值。
 * @param {User} mainUser 主要使用者的資料。
 * @param {string} otherUser_id 目標要查詢的使用者_id。
 * @return {number} 觀看權限數值。
 */
function GetAuthorityNumber(mainUser, otherUser_id) {
    if (mainUser._id.equals(otherUser_id)) {            // 若mainUser與otherUser為同一人，則回傳2。
        return 2;
    }
    else if (mainUser.IsUsersFriend(otherUser_id)) {    // 若otherUser為mainUser的好友，則回傳1。
        return 1;
    }
    else {                                              // 若不為好友，則回傳0。
        return 0;
    }
}

/**
 * @typedef PaintingRange
 * @prop {number} n 表示第n個區間。
 * @prop {string[]} range_id 表示在第n個區間中的圖畫Id。
 */
/**
 * 取得目標要尋找的圖畫Id座落的區間與該區間中第一個圖畫Id。
 * @param {Painting[]} list 全域的資料。為圖畫陣列。
 * @param {string} id 要尋找座落在哪區間的資料。為圖畫Id。
 * @param {number} viewAutho 觀看權限數值。
 * @return {PaintingRange} 回傳第N個區間整數與該區間中的第一個圖畫Id。為 {n, range_id}。
 */
function GetRangeIndex(list, id, viewAutho) {
    let viewList = list.filter((docs => docs.viewAuthority <= viewAutho));  // 用「訪問權限」與觀看權限數值，過濾原本的畫作清單，成新的畫作清單。
    let length = viewList.length;                                           // 取得清單內容長度
    // 尋找目標畫作在清單中的索引位置
    for (let i = 0; i < length; i++) {
        if (list[i].id == id) {
            // 以十個畫作為一組，取得目前在第n組
            let n = Math.floor(i / 10);

            // 回傳n，與第n組中 (n * 10) ~ (n * 10 + 9) 之間的畫作_id清單。
            return { n: n, range_id: list.slice(n * 10, n * 10 + 10).filter(docs => docs._id) };
        }
    }
    // 若沒找到則回傳null。
    return null;
}

/**
 * 為「個人藝廊」模式下的插值方法。
 * @param {BasicLayout} renderData 基本差值物件。
 * @param {string[]} params 路由路徑中的每項參數。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function PersonalShowcaseRender(renderData, params, session, callback) {
    let username = params[2];       // 此個人藝廊的使用者
    let paintingId = params[3];     // 指定要瀏覽的畫作Id
    let tag = params[4];            // 指定畫作的標籤群組(可有可無)
    let datas = renderData.datas;

    datas.isActivity = false;
    datas.themeTitle = null;
    datas.themeOriginator = null;
    datas.artist = username;
    datas.tag = tag;
    datas.paintings = [];           // 建立畫作清單欄位

    // 建立 Populate Query
    let populateQuery = {
        path: "paintings",
        select: { "id": 1, "viewAuthority": 1 },
        match: { "isLocked": false }
    };

    // 如果有指定tag，則將其加入到populateQuery之中作為條件
    // 比對每個畫作的標籤中是否有包含tag。
    if (tag)
        populateQuery.match.tags = tag;

    // 以username尋找目標使用者的資料，其中選取paintings欄位，然後再以populateQuery做畫作連結
    User.findOne({"username": username})
        .select("personalInfo.photo paintings friendList")
        .populate(populateQuery)
        .exec((err, userDocs) => {
            if (err) callback(err, null);
            if (!userDocs) callback(User.Error_UserNotExist(), null);           // 若找不到使用者，則帶著相對應的錯誤回呼
            let ownersPhotoURL = userDocs.personalInfo.photo;                   // 擁有此展示藝廊的人的頭像照片
            let paintingList = userDocs.paintings;                              // 取得畫作Id清單
            let viewAuth = GetAuthorityNumber(userDocs, session.passport.user); // 取得觀看權限數值
            let rangeInfo = GetRangeIndex(paintingList, paintingId, viewAuth);  // 取得區間資料

            // 如果目標畫作不在清單之中的話，則回呼錯誤  **仍要再改
            if (!rangeInfo) return callback(new Error("找不到對應的畫作。"), null);

            // 以區間尋找畫作資訊
            Painting.find({ "_id": { $in: rangeInfo.range_id } })
                .populate([{path: "ratings"}, {path: "comments"}])
                .exec((err, paintingDocs) => {
                    if (err) callback(err, null);
                    
                    // 循每一個畫作資料，取其中的欄位資料加入至 datas.paintings 中
                    paintingDocs.forEach((docs) => {
                        datas.paintings.push({
                            id: docs.id,
                            links: docs.links,
                            name: docs.name,
                            description: docs.description,
                            artistInfo: { name: username, photoURL: ownersPhotoURL},
                            totalScore: docs.totalScore,
                            userScore: docs.FindRatingScoreByUsername(renderData.username),
                            comments: docs.comments
                        });
                    });

                    // 最後，取得當前使用者的個人照片
                    User.findOne({"_id": session.passport.user}, "personalInfo.photo", (err, guestUserDocs) => {
                        if (err) return callback(err, null);
                        if (!guestUserDocs) return callback(User.Error_UserNotExist(), null);
                        datas.photoURL = guestUserDocs.personalInfo.photo;                      // 取得當前使用者的個人照片

                        callback(null, true);
                    });
                }
            );
        }
    );
}

/**
 * 為「活動藝廊」模式下的差值方法。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string[]} params 路由路徑中的每項參數。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function ActivityShowcaseRender(renderData, params, session, callback) {
    
}

/**
 * 
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function ShowcaseRender(renderData, route, session, callback) {
    let params = route.split("/").slice(1);
    switch(params[1]) {
        case "personal":
            PersonalShowcaseRender(renderData, params, session, callback);
            break;
        case "activity":
            ActivityShowcaseRender(renderData, params, session, callback);
            break;
        default:
            callback(new Error("未定義的展示藝廊模式。"), null);
    }
}

module.exports.Render = ShowcaseRender;