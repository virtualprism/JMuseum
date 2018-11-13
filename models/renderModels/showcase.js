
const User = require("../mongooseSchemas/User");
const Painting = require("../mongooseSchemas/Painting");
const Season = require("../mongooseSchemas/Season");
const Theme = require("../mongooseSchemas/Theme");
const ParticipantInfo = require("../mongooseSchemas/ParticipantInfo");

const Error_SeasonIsNotPosiInt = new Error("指定的季欄位必須為正整數。");
const Error_ThemeIsNotPosiInt = new Error("指定的主題欄位必須為正整數。");
const Error_SeasonNotExist = new Error("指定的季活動並不存在。");
const Error_ThemeNotExist = new Error("指定的主題活動並不存在。");
const Error_ParticipantNotExist = new Error("指定的參加者資料並不存在。");

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
function Personal_GetRangeIndex(list, id, viewAutho) {
    let viewList = list.filter((docs => docs.viewAuthority <= viewAutho));  // 用「訪問權限」與觀看權限數值，過濾原本的畫作清單，成新的畫作清單。
    let length = viewList.length;                                           // 取得清單內容長度
    // 尋找目標畫作在清單中的索引位置
    for (let i = 0; i < length; i++) {
        if (list[i].id == id) {
            // 以十個畫作為一組，取得目前在第n組
            let n = Math.floor(i / 10);

            // 回傳n，與第n組中 (n * 10) ~ (n * 10 + 9) 之間的畫作_id清單。
            return { n: n, range_id: list.slice(n * 10, n * 10 + 10).map(docs => docs._id) };
        }
    }
    // 若沒找到則回傳null。
    return null;
}

/**
 * 判斷字串value是否為正整數。
 * @param {string} value 要進行判斷的字串。
 */
function IsPositiveInt(value) {
    let x;
    return isNaN(value) ? false : (x = parseFloat(value), (0 | x) === x && x >= 0);
}

/**
 * @typedef ParticipationRange
 * @prop {number} n 表示第n個區間。
 * @prop {string[]} range_id 表示第n個區間中的參加者id資料。
 */
/**
 * 以參加者資料id，尋找在參加者資料清單(list)中該id所座落的區間與區間的資料。以10個參賽者資料作為一個區間。
 * @param {Participation[]} list 參加者一資料清單。
 * @param {string?} id 目標要尋找座落於何區間的目標id。
 * @return {ParticipationRange | null} 回傳第n個區間之整數，與該區間的所有資料。
 */
function Activity_GetRangeIndex(list, id) {
    // 若有指定id，則嘗試尋在目標id所座落的區間
    if (id && id.length > 0) {
        let length = list.length;
        for (let i = 0; i > length; i++) {
            if (id == list[i].id) {
                let n = Math.floor(i / 10);     // 以十個資料作為一組

                // 取得第n個區間與該區間的_id資料(Participation)
                return { n: n, range_id: list.slice(n * 10, n * 10 + 10).map(docs => docs._id) };
            }
        }
        return null;
    }
    // 若沒有指定，則直接回傳第一個區間
    else {
        return { n: 0, range_id: list.slice(0, 10).map(docs => docs._id) };
    }
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
            if (!userDocs) callback(User.Error_UserNotExist(), null);                   // 若找不到使用者，則帶著相對應的錯誤回呼
            let ownersPhotoURL = userDocs.personalInfo.photo;                           // 擁有此展示藝廊的人的頭像照片
            let paintingList = userDocs.paintings;                                      // 取得畫作Id清單
            let viewAuth = GetAuthorityNumber(userDocs, session.passport.user);         // 取得觀看權限數值
            let rangeInfo = Personal_GetRangeIndex(paintingList, paintingId, viewAuth); // 取得區間資料

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
    let seasonNum = params[2];      // 表示第seasonNum季
    let themeNum = params[3];       // 表示在該季之中的第themeNum個主題
    let partId = params[4];         // 在該主題中的投稿Id
    let datas = renderData.datas;

    if (!IsPositiveInt(seasonNum))     // 若season不為正時數的話，則回呼錯誤
        return callback(Error_SeasonIsNotPosiInt, null);
    
    if (!IsPositiveInt(themeNum))      // 若theme不為正時數的話，則回呼錯誤
        return callback(Error_ThemeIsNotPosiInt, null);
    
    datas.isActivity = true;
    datas.nthSeason = seasonNum;
    datas.themeOrder = themeNum;
    datas.photoURL = session.user.personalInfo.photo;

    /**
     * 建立Populate Query，
     * 尋找在指定第seasonNum季下的第themeNum個主題，
     * 取得該主題中的所有參加者資料的id與_id。
     */
    let populateQuery = {
        path: "themes",
        select: { "themes": 1 },
        match: { "order": themeNum },
        populate: { 
            path: "participants",
            select: { "id": 1, "postTime": 1 }
        }
    };

    // 找出第seasonNum季下的第themeNum個主題，並透過populateQuery取得指定的資料
    Season.aggregate(
          
    );
    Season.findOne({ nth: seasonNum })
        .populate(populateQuery)
        .exec((err, seasonDocs) => {
            if (err) return callback(err, null);
            // 當seasonDocs不存在時，回呼「指定的季活動並不存在。」錯誤。
            if (!seasonDocs) return callback(Error_SeasonNotExist, null);
            // 當seasonDocs中的 themes 或 themes[0] 不存在時，回呼「指定的主題活動並不存在。」錯誤。
            if (!seasonDocs.themes || !seasonDocs.themes[0]) return callback(Error_ThemeNotExist, null);
            
            let participations = seasonDocs.themes[0].participants;             // 取得參加者資料
            let rangeData = Activity_GetRangeIndex(participations, partId);     // 取得區間數字與區間_id資料

            if (!rangeData) return callback(Error_ParticipantNotExist, null);   // 若取得區間的函式回傳null，則代表目標要尋找的id不存在

            // 以區間的_id資料清單來尋找
            ParticipantInfo.find({ "_id": { $in: rangeData.range_id } }, (err, partDocs) => {
                if (err) return callback(err, null);


            });
        }
    )
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