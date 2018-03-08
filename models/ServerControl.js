const fileSystem = require("fs");
const mongoose = require("mongoose");
const ServerStatus = require("../ServerStatus");

const COUT = process.stdout;

/** 集合所有的資料庫模板資料。 */
const DBModels = {
    "User": require("./mongooseSchemas/User"),
    "Painting": require("./mongooseSchemas/Painting"),
    "Season": require("./mongooseSchemas/Season"),
    "Theme": require("./mongooseSchemas/Theme"),
    "Participation": require("./mongooseSchemas/Participation"),
    "ParticipantInfo": require("./mongooseSchemas/ParticipantInfo"),
    "SiteMail": require("./mongooseSchemas/SiteMail"),
    "SiteMessage": require("./mongooseSchemas/SiteMessage"),
    "Rating": require("./mongooseSchemas/Rating"),
    "Comment": require("./mongooseSchemas/Comment"),
    "NewTheme": require("./mongooseSchemas/NewTheme"),
    "PaintingSpotlight": require("./mongooseSchemas/PaintingSpotlight"),
    "ServerMessage": require("./mongooseSchemas/ServerMessage")
};

/** 指令字串切割方式 */
const cmdSpliter = / +/g;

/** 目前正用於處理指令輸入操作的函式。 */
let CurrentOperationFunc = CommandRoutes;

/** 承接頂層的LineReader之指令處理函式。 */
function MiddleHandler(line) { CurrentOperationFunc(line); }

/** 關閉、離開伺服器運行的方法函式。 */
let ExitServerFunction;

/**
 * 初始化「指令路由」的初始化函式。
 * @param {Function} ExitServFunc 停止伺服器運作的函式。此方法由外部傳入。
 */
function Init(ExitServFunc) {
    ExitServerFunction = ExitServFunc;
    return MiddleHandler;
}

/**
 * 指令路由函式。
 * @param {string} line 從標準文字輸入所接收到的一行輸入字串。
 */
function CommandRoutes(line) {
    let query = line.split(cmdSpliter);     // 以空格來切割每一個指令
    switch(query[0]) {
        case ".exit":       ExitServerFunction(); break;
        case "showstatus":  ShowServerStatus(); break;
        case "act":         ActivityFunction(query); break;
        case "servmsg":     ServMessageFunction(query); break;
        case "db":          DatabaseFunctions(line, query); break;
        case "restore":     ServerRestoreCommand(); break;
        case "help":        HelpInformation(); break;
        case "test":        Test(); break;
        default:
            console.log("\n錯誤: 找不到指令或巨集。\n");
    }
}

//#region ==================== Show Status Operation Command =========================
/**
 * 顯示目前伺服器的狀態。
 */
function ShowServerStatus() {
    let status = ServerStatus.status;
    if (status) {
        let info =  "目前舉行的活動為第 " + status.currentSeason + " 季\n" +
                    "主題投稿活動： " + ( status.submitThemeEvent ? "運行中\n" : "未運行\n" ) +
                    "主題投票活動： " + ( status.voteThemeEvent ? "運行中\n" : "未運行\n" ) +
                    "在主題投票活動中，每位使用者能夠投選" + status.voteCount + "個候選主題\n" + 
                    "在主題投票活動完成之後，會選出前" + status.promotionCount + "高票個候選主題作為新一季的主題\n" +
                    "自動活動排程系統目前" + ( status.onSchedule ? "正在運行中\n" : "停止使用中\n" ) +
                    "伺服狀態自動儲存: " + ( status.autoSaveStatus ? "開啟\n" : "關閉\n" );
        console.log("\n==================== 伺服器狀態 ====================");
        console.log(info);
    }
    else {
        console.log("\nPlease wait for loading server status file.\n");
    }
}
//#endregion =========================================================================

//#region ==================== Activity Operation Commands ====================
/**
 * 與藝廊活動有關的相關操作函式。
 * @param {string[]} query 解析後的指令片段。
 */
function ActivityFunction(query) {
    let operation = query[1];
    switch(operation) {
        case "status":  Act_Status(); break;
        case "push":    Act_Push(); break;
        case "help":    Act_Help(); break;
        default:
            console.log("\n錯誤: 找不到指令或巨集。\n");
    }
}

/**
 * 顯示目前活動的狀態。
 */
function Act_Status() {
    let status = ServerStatus.status;
    let info = "\n目前舉行的活動為第 " + status.currentSeason + " 季\n";
    // 若「投稿主題」正在進行中
    if (status.submitThemeEvent) {
        info += "當前正為下一季的活動做準備，正舉行著「投稿主題」中。\n";
    }
    // 若「票選主題」正在進行中
    else if (status.voteThemeEvent) {
        info += "當前正為下一季的活動做準備，正舉行著「投稿主題」中。\n";
    }
    info += "目前的活動規劃" + (status.onSchedule ? "由排程系統自動進行中。\n" : "為手動操作。\n");
    console.log(info);
}

/**
 * 以手動的方式推進活動狀態。
 * 若活動排程系統為啟用的狀態，則這個操作將會失效。
 * @param {string[]} query 解析後的指令片段。
 */
function Act_Push(query) {
    let status = ServerStatus.status;
    // 若排程系統是啟用的，則印出訊息。
    if (status.onSchedule) {
        console.log("\n目前的活動規劃由排程系統管理中，無法做手動操作的部分。");
        console.log("若想要進行「活動階段推進」的動作，請先將排程系統關閉。\n");
        return;
    }

    // 若排程系統是關閉的，則先確認是否要執行活動狀態推進的動作。
    function AskPush(line) {
        if (line == "Y" || line == "y") {       // 若使用者確認，則將處理文字輸入的主函式改回，並進行推進的動作
            CurrentOperationFunc = CommandRoutes;
            PushActivity();
        }
        else if (line == "N" || line == "n") {  // 若使用者確認，則將處理文字輸入的主函式改回，並進行推進的動作
            CurrentOperationFunc = CommandRoutes;
            console.log();
        }
        else {
            console.log("\n請輸入Y或N來決定是否要推進狀態: \n");
        }
    }

    let curSeason = status.currentSeason;   // 取得目前的季數
    COUT.write("\n目前的活動狀態為");

    // 依不同的狀態印出訊息
    switch(true) {
        case status.submitThemeEvent:       // 若目前「投稿主題」活動正在進行
            COUT.write("「投稿主題」。\n");
            console.log("若要推進，則活動狀態會到第" + curSeason + "季與第" + (curSeason + 1) + "季的「主題票選」活動。\n");
            break;
        case status.voteThemeEvent:         // 若目前「主題票選」活動正在進行
            COUT.write("「主題票選」。\n");
            console.log("若要推進，則活動狀態會到第" + (curSeason + 1) + "季，也就是更新到全新的一季。\n");
            break;
        default:                            // 若目前僅進行一般的季活動
            COUT.write("「一般活動」。\n");
            console.log("若要推進，則活動狀態會到第" + curSeason + "季與第" + (curSeason + 1) + "季的「投稿主題」活動。\n");
    }
    console.log("\n請問是否要推進? (Y/N) \n");
    CurrentOperationFunc = AskPush;     // 將處理文字輸入的主函式改為AskPush，也就是詢問是否要推進。
}
//#region Functions that Act_Push use.
/**
 * 實作「活動階段推進」的程式動作。 (順序 1)
 */
function PushActivity() {
    let status = ServerStatus.status;   // 取得伺服器狀態物件
    // 若目前「投稿主題」活動正在進行
    if (status.submitThemeEvent) {
        status.submitThemeEvent = false;
        status.voteThemeEvent = true;

        // 刷新使用者資料中的 hasVotedNewTheme 欄位，將其轉變為false。
        DBModels.User.Refresh_HasVotedNewTheme((err) => {
            if (err) return console.log("\n設定使用者資料的時候發生了錯誤。請確認是否有與MongoDB連線。\n");

            // 詢問並設定每一位使用者投票的票數
            AskPromotionTheme(status.submitThemeEvent, status.voteThemeEvent, status.currentSeason);
        });
    }
    // 若目前「主題票選」活動正在進行
    else if (status.voteThemeEvent) {
        status.voteThemeEvent = false;
        status.currentSeason += 1;

        // 將新的一季活動做推進
        DBModels.Season.PushNewSeason((err, result) => {
            if (err) return console.log(result);
            AskBroadcastServerMessage(status.submitThemeEvent, status.voteThemeEvent, status.currentSeason);
        });
    }
    // 若目前僅一般主題在進行
    else {
        status.submitThemeEvent = true;
        // 刷新使用者資料中的 hasPostNewTheme 欄位，將其轉變為false。
        DBModels.User.Refresh_HasPostNewTheme((err) => {
            if (err) return console.log("\n設定使用者資料的時候發生了錯誤。請確認是否有與MongoDB連線。\n");

            // 詢問是否進行伺服訊息廣播
            AskBroadcastServerMessage(status.submitThemeEvent, status.voteThemeEvent, status.currentSeason);
        });
    }
}

/** 
 * 詢問使用者要選取NewTheme中前幾個主題做為最新一季的主題。
 * @param {boolean} submitTheme 「投稿主題」活動是否為進行中。
 * @param {boolean} voteTheme 「主題票選」活動是否為進行中。
 * @param {number} curSeason 目前最新的季。
 */
function AskPromotionTheme(submitTheme, voteTheme, curSeason) {
    let validator = str => /^([1-9]\d*)$/.test(str);
    let ask = "\n在此次主題票選當中，在最後要選取多少候選主題出來作為新一季的主題: ";

    /** 處理使用者的回應 */
    function HandleResponse(line) {
        // 檢查使用者輸入的數值是否為大於0的正整數
        if (!validator(line)) {
            COUT.write("請輸入大於0的正整數、小於等於總候選主題數的數字: ");
            return;
        }
        // 檢查使用者輸入的數字是否小於等於候選主題的總數
        let count = parseInt(line);
        DBModels.NewTheme.count({}, (err, number) => {
            if (err) {
                console.log("\n檢查候選主題總數時發生了錯誤。請檢查MongoDB是否開啟或稍後重新操作。\n");
                CurrentOperationFunc = CommandRoutes;
                return;
            }
            // 若有小於等於候選主題總數，則進行下一步「詢問是否要對所有使用者廣播訊息」
            if (count <= number) {
                ServerStatus.status.promotionCount = count;                     // 將數量記在伺服狀態的promotionCount中
                AskBroadcastServerMessage(submitTheme, voteTheme, curSeason);
            }
            else {
                COUT.write("請輸入大於0的正整數、小於等於總候選主題數的數字: ");
            }
        }); 
    }

    COUT.write(ask);
    CurrentOperationFunc = HandleResponse;
}

/**
 * 詢問是否要進行伺服器的訊息廣播。 (順序 2)
 * @param {boolean} submitTheme 「投稿主題」活動是否為進行中。
 * @param {boolean} voteTheme 「主題票選」活動是否為進行中。
 * @param {number} curSeason 目前最新的季。
 */
function AskBroadcastServerMessage(submitTheme, voteTheme, curSeason) {
    let ask = "是否要對個使用者做新活動的訊息廣播? (Y/N) ";
    let title, content;
    COUT.write(ask);

    /** 定義處理使用者輸入訊息標題的函式 (順序 3.A.1) */
    function HandleTitleResponse(line) {
        title = line;
        console.log("請輸入訊息內容:");
        CurrentOperationFunc = HandleContentResponse;
    }

    /** 定義處理使用者輸入訊息內容的函式 (順序 3.A.2) */
    function HandleContentResponse(line) {
        content = line;
        COUT.write("確認廣播此伺服訊息? (Y/N) ");
        CurrentOperationFunc = ConfirmServerMessage;
    }

    /** 定義處理使用者是否使用預設的訊息內容 (順序 3.B.1) */
    function DefaultResponse(line) {
        if (line == "Y" || line == "y") {
            // 以資料title、content來對所有使用者進行廣播
            BroadcastServerMessage(title, content, (err, result) => {
                if (err)  return console.log("\n" + result + "\n");
                
                // 依照不同狀態輸出成功訊息
                console.log("\n已成功地將最新的活動訊息廣播給所有使用者！");
                ShowFinishMessage(submitTheme, voteTheme, curSeason);
                
                // 最後將主要處理文字輸入的方法設定回主指令路由函式中
                CurrentOperationFunc = CommandRoutes;
            });
        }
        else if (line == "N" || line == "n") {
            // 如果使用者拒絕使用預設的伺服器廣播訊息，則輸出最終訊息，並將處理文字輸入的變數函式指回主處理函式
            ShowFinishMessage(submitTheme, voteTheme, curSeason);
            CurrentOperationFunc = CommandRoutes;
        }
        else {
            COUT.write("請問是否要使用預設的廣播訊息內容? (Y/N) ");
        }
    }

    /** 確認使用者是否要廣播此伺服訊息 (順序 3.A.3) */
    function ConfirmServerMessage(line) {
        if (line == "Y" || line == "y") {
            // 以資料title、content來對所有使用者進行廣播
            BroadcastServerMessage(title, content, (err, result) => {
                if (err)  return console.log("\n" + result + "\n");
                
                // 依照不同狀態輸出成功訊息
                console.log("\n已成功地將最新的活動訊息廣播給所有使用者！");
                ShowFinishMessage(submitTheme, voteTheme, curSeason);
                
                // 最後將主要處理文字輸入的方法設定回主指令路由函式中
                CurrentOperationFunc = CommandRoutes;
            });
        }
        else if (line == "N" || line == "n") {
            // 如果選擇不廣播伺服訊息，則再一次詢問「是否要做活動訓席廣播」
            AskBroadcastServerMessage(submitTheme, voteTheme, curSeason);
        }
        else {
            COUT.write("確認廣播此伺服訊息? (Y/N) ");
        }
    }

    /** 處理回應 (順序 3) */
    function HandleResponse(line) {
        // 若決定要對使用者進行廣播，則先詢問廣播訊息的標題
        if (line == "Y" || line == "y") {
            console.log("請輸入訊息標題:");
            CurrentOperationFunc = HandleTitleResponse;
        }
        // 若沒有決定要自行廣播，則再詢問是否要進行預設的伺服器訊息廣播
        else if (line == "N" || line == "n") {
            [title, content] = GetDefaultActivityServMsg(submitTheme, voteTheme, curSeason);
            console.log("\n預設的廣播格式為:");
            console.log("標題: %s", title);
            console.log("內容: %s\n", content);
            COUT.write("請問是否要使用預設的廣播訊息內容? (Y/N) ");
            CurrentOperationFunc = HandleDefaultResponse;
        }
        else {
            COUT.write(ask);
        }
    }

    // 變更主要處理文字輸入的函式
    CurrentOperationFunc = HandleResponse;
}

/**
 * 在「活動階段推進」之中，最後完成動作時所顯示的訊息。
 * @param {boolean} submitTheme 「投稿主題」活動是否為進行中。
 * @param {boolean} voteTheme 「主題票選」活動是否為進行中。
 * @param {number} curSeason 目前最新的季。
 */
function ShowFinishMessage(submitTheme, voteTheme, curSeason) {
    if (submitTheme)
        console.log("\n第%d季的「投稿主題」活動已經開始！\n", curSeason + 1);
    else if (voteTheme)
        console.log("\n第%d季的「投稿主題」活動已經結束。活動「主題票選」已經開始！\n", curSeason + 1);
    else
        console.log("\n第%d季的繪圖投稿活動與第%d季的「主題票選」活動已經結束。\n最新第%d季的活動已經開始！\n", curSeason - 1, curSeason, curSeason);
}

/**
 * 取得預設的伺服器廣播訊息。
 * @param {boolean} submitTheme 「投稿主題」活動是否為進行中。
 * @param {boolean} voteTheme 「主題票選」活動是否為進行中。
 * @param {number} curSeason 目前最新的季。
 * @return {string[]} 預設的伺服訊息中的 [標題, 內容] 的成對。
 */
function GetDefaultActivityServMsg(submitTheme, voteTheme, curSeason) {
    switch(true) {
        case submitTheme:
            return ["第" + (curSeason + 1) + "季的「投稿主題」活動已經開始！",
                    "最新的「主題投稿」活動已經開始了！無論是有創意、有熱情、有特殊想法的作家們，趕緊來發起你們心中所想要的主題吧！人人都有機會在版面上看到自己所投稿的主題噢！"];
        case voteTheme:
            return ["第" + (curSeason + 1) + "季的「主題票選」活動已經開始！",
                    "最新的「主題票選」活動已經開始了！無論你在先前有投稿主題或沒有投稿主題，趕緊來這個活動看看，有沒有你所想要、中意的主題，有的話就把你手中的票朝那主題投下去吧！"];
        default:
            return ["最新一季繪畫活動，第" + curSeason + "季已經開始了！！",
                    "第" + curSeason + "季的繪畫活動已經開始了！來看看在這最新的一季當中，有沒有你所喜歡的、所愛的主題，有的話就開始動起你手中的創意、發揮你的天份，來開始畫畫吧！此外，第" + ( curSeason - 1 ) + "季的繪畫活動結果已經出爐了，可以去瞧一瞧是哪幾位大師登上旁行榜吧！"];
    }
}
//#endregion

/** 
 * 查詢指令"act"的相關功能與說明。
 */
function Act_Help() {
    console.log("\nact - 與伺服器活動有相關的操作");
    console.log("act status : 檢視目前伺服器活動的狀態訊息。");
    console.log("act push   : 以手動的方式做「活動階段推進」的動作。");
    console.log("act help   : 查詢指令act的相關操作方式。\n")
}

/**
 * 新增、廣播伺服訊息。
 * @param {string} title 訊息的標題。
 * @param {string} content 訊息的內容。
 * @param {CallbackFunction} callback 回呼函式。
 */
function BroadcastServerMessage(title, content, callback) {
    let ServerMessage = DBModels.ServerMessage;
    let User = DBModels.User;
    // 建立一個新的伺服訊息資料
    ServerMessage.createNewServerMessage({ title, content }, (err, _id) => {
        if (err) return callback(err, "在建立新的伺服器訊息時發生了錯誤，請改用一般的廣播方式來進行廣播。");
        // 透過伺服訊息資料的_id，加入至各使用者的siteMsg中
        User.BroadcastServerMessage(_id, (err, result) => {
            if (err) return callback(err, "在對所有使用者進行廣播動作時發生了錯誤。請更改使用單一或多項指定來傳送伺服訊息。");
            callback(null, true);
        });;
    });
}

//#endregion ======================================================================

//#region ==================== Server Message Operation Commands ====================
/**
 * 撰寫伺服器訊息相關功能的函式。
 * @param {string[]} query 解析後的指令片段。
 */
function ServMessageFunction(query) {
    let operation = query[1];
    switch(operation) {
        case "sendone":   WriteServMsg(ServMsg_SendOne, false);  break;
        case "sendmany":  WriteServMsg(ServMsg_SendOne, false);  break;
        case "broadcast": WriteServMsg(ServMsg_Broadcast, true); break;
        case "help":      ServMsg_Help(); break;
        default:
            console.log("\n錯誤: 找不到指令或巨集。\n");
    }
}

/**
 * 實行指令"servmsg sendone"之指令。此函式必須要透過WriteServMsg函式內部來呼叫。
 * @param {string} title 伺服訊息的標題。
 * @param {string} content 伺服訊息的內容。
 * @param {boolean} isPrivate 是否為私密訊息。
 */
function ServMsg_SendOne(title, content, isPrivate) {
    let User = DBModels.User;
    /** 接收輸入的使用者名稱。 */
    function InputUsername(username) {
        // 嘗試取得目標使用者
        User.findOne({ "username": username }, (err, userDocs) => {
            if (err) {
                console.log("\n尋找目標使用者時發生了錯誤。請確認是否有連接上MongoDB。");
                CurrentOperationFunc = CommandRoutes;
            }
            else if (!userDocs) {
                console.log("\n找不到目標使用者，請再輸入一次: (使用者名稱) ");
            }
            else {
                userDocs.AddNewSiteMessage(title, content, isPrivate);
                userDocs.save((err) => {
                    if (err) {
                        console.log("\n使用者資料儲存失敗。請檢查是否與MongoDB連線正常。\n");
                    }
                    else {
                        console.log("\n伺服訊息發送成功!\n");
                    }
                    CurrentOperationFunc = CommandRoutes;
                });
            }
        });
    }

    console.log("\n請問要發送給哪位使用者? (使用者名稱) ")
    CurrentOperationFunc = InputUsername;
}

/**
 * 實行指令"servmsg sendmany"之指令。此函式必須要透過WriteServMsg函式內部來呼叫。
 * @param {string} title 伺服訊息的標題。
 * @param {string} content 伺服訊息的內容。
 * @param {boolean} isPrivate 是否為私密訊息。
 */
function ServMsg_SendMany(title, content, isPrivate) {
    let User = DBModels.User;
    /** 處理使用者輸入的使用者名稱。 */
    function InputUsername(username) {
        // 若有輸入文字則進行以下動作
        if (username.length > 0) {
            // 以使用者輸入的 username 尋找目標使用者是否存在
            User.findOne({ "username": username }, (err, userDocs) => {
                if (err) {
                    console.log("\n尋找目標使用者時發生了錯誤。請確認是否有連接上MongoDB。");
                    CurrentOperationFunc = CommandRoutes;
                }
                else if (!userDocs) {
                    console.log("\n找不到目標使用者，請在輸入一次: (輸入使用者名稱，或直接按下Enter來完成動作)");
                }
                else {
                    // 使用者存在，則以title、content與isPrivate新增主頁訊息
                    userDocs.AddNewSiteMessage(title, content, isPrivate);
                    // 新增完後做儲存動作。
                    userDocs.save((err) => {
                        if (err) {
                            console.log("\n使用者資料儲存失敗。請檢查是否與MongoDB連線正常。\n");
                            CurrentOperationFunc = CommandRoutes;
                        }
                        else {
                            console.log("\n伺服訊息發送成功，請繼續輸入? (輸入使用者名稱，或直接按下Enter來完成動作)");
                        }
                    });
                }
            });
        }
        else {
            console.log("\n已完成訊息發送動作。\n");
            CurrentOperationFunc = CommandRoutes;
        }
    }

    console.log("\n請問要發送給哪位使用者? (輸入使用者名稱，或直接按下Enter來完成動作)");
    CurrentOperationFunc = InputUsername;
}

/**
 * 實行指令"servmsg broadcast"之指令。此函式必須要透過WriteServMsg函式內部來呼叫。
 * @param {string} title 伺服訊息的標題。
 * @param {string} content 伺服訊息的內容。
 */
function ServMsg_Broadcast(title, content) {
    let ServerMessage = DBModels.ServerMessage;
    let User = DBModels.User;
    // 以title、content建立伺服訊息(廣播訊息)
    ServerMessage.createNewServerMessage({ title, content }, (err, _id) => {
        if (err) {
            console.log("\n建立伺服訊息資料時發生了錯誤，請檢查是否有連接上MongoDB。\n");
            CurrentOperationFunc = CommandRoutes;
            return;
        }
        // 定義要加入到各個使用者資料上的主頁訊息資料
        let data = {
            isServerMessage: true,
            refId: _id,
            postTime: new Date(),
            isSeen: false,
            isPrivate: false
        };
        // 更新所有使用者資料，將資料加入至siteMsg之中。
        User.updateMany({}, { $push: { siteMsg: data } }, (err, raw) => {
            if (err) {
                console.log("\n將新的伺服訊息更新至所有使用者的資料之中時發生了錯誤，請檢查是否有連接上MongoDB。\n");
            }
            else {
                console.log("\n您的伺服訊息已成功地廣播給所有使用者了！\n");
            }
            CurrentOperationFunc = CommandRoutes;
        });
    });
}

/**
 * 撰寫完訊息之後所要將標題、內容交給目標函式處理的函式。
 * @typedef {Function} WritenMethod
 * @param {string} title 訊息的標題。
 * @param {string} content 訊息的內容。
 * @param {boolean} isPrivate 是否為私密訊息。
 */
/**
 * 撰寫伺服器訊息。
 * @param {WritenMethod} sendMethod 當伺服訊息完成之後，所要處理標題、內容的函式。
 * @param {boolean} isBroadcast 是否為廣播訊息。
 */
function WriteServMsg(sendMethod, isBroadcast) {
    let title = "", content = "";
    let isPrivate;
    /** 撰寫訊息的標題。 */
    function WriteTitle(line) {
        title = line;
        console.log("\n請在以下轉寫你所要的訊息內容，直到內容中出現「\\0」才會進行下一步驟:");
        CurrentOperationFunc = WriteContent;
    }

    /** 撰寫訊息內容。 */
    function WriteContent(line) {
        let endIndex = line.search(/\\0/);
        if (endIndex < 0) {
            content += line;
        }
        else {
            content += line.substr(0, endIndex);
            // 若是廣播的話，則跳過觀看權限詢問。
            if (isBroadcast) {
                console.log("\n您的伺服訊息已經撰寫完成，內容如下。");
                console.log("標題: %s", title);
                console.log("內容: %s", content);
                console.log("* 由於此訊息為廣播訊息，因此全部使用者皆有觀看權限。 *");
                console.log("\n以上是否已為你所想要的內容呢? (Y/N) ");
                CurrentOperationFunc = ConfirmIsDone;
            }
            else {
                console.log("\n此訊息是否僅限使用者本身能看到: (Y/N) ");
                CurrentOperationFunc = SetIsPrivate;
            }
        }
    }

    /** 設定此訊息的觀看權限。 */
    function SetIsPrivate(line) {
        if (line == "Y" || line == "y" || line == "N" || line == "n") {
            isPrivate = (line == "Y" || line == "y");
            console.log("\n您的伺服訊息已經撰寫完成，內容如下。");
            console.log("標題: %s", title);
            console.log("內容: %s", content);
            console.log("僅限擁有者能觀看: %s", isPrivate ? "Yes" : "No");
            console.log("\n以上是否已為你所想要的內容呢? (Y/N) ");
            CurrentOperationFunc = ConfirmIsDone;
        }
        else {
            console.log("\n此訊息是否僅限使用者本身能看到: (Y/N) ");
        }
    }

    /** 確認訊息是否撰寫完成。 */
    function ConfirmIsDone(line) {
        if (line == "Y" || line == "y") {
            sendMethod(title, content, isPrivate);
        }
        else if (line == "N" || line == "n") {
            console.log("\n是否要再撰寫一份新的伺服訊息呢? (Y/N) ");
            CurrentOperationFunc = ConfirmAgain;
        }
        else {
            console.log("\n以上是否已為你所想要的內容呢? (Y/N) ");
        }
    }

    /** 已經被回拒，但再次確認是否要再撰寫一次。 */
    function ConfirmAgain(line) {
        if (line == "Y" || line == "y") {
            content = "";
            console.log("請寫上您所想要的伺服訊息標題: ");
            CurrentOperationFunc = WriteTitle;
        }
        else if (line == "N" || line == "n") {
            console.log();
            CurrentOperationFunc = CommandRoutes;
        }
        else {
            console.log("\n以上是否已為你所想要的內容呢? (Y/N) ");
        }
    }

    console.log("\n請寫上您所想要的伺服訊息標題: ");
    CurrentOperationFunc = WriteTitle;
}

/** 
 * 查詢伺服器訊息指令"servmsg"的相關操作用法。
 */
function ServMsg_Help() {
    console.log("\nservmsg - 與伺服器傳送訊息有關的操作");
    console.log("servmsg sendone   : 撰寫伺服器訊息，並將訊息傳送給指定的使用者。");
    console.log("servmsg sendmany  : 撰寫伺服器訊息，並將訊息傳給選定的多對使用者。");
    console.log("servmsg broadcast : 撰寫伺服器訊息，並將訊息廣播給全部的使用者。");
    console.log("servmsg help      : 查詢此指令的相關操作方式。\n");
}

//#endregion ======================================================================

//#region ====================== Database Operation Commands ======================

/**
 * 有關於資料庫操作的相關指令動作。
 * @param {string} original 原始完整的指令碼。
 * @param {string[]} query 解析後的指令片段。
 */
function DatabaseFunctions(original, query) {
    let operation = query[1];
    switch(operation) {
        case "find": DBOp_Find(original, query); break;
        case "user": DBOp_User(query); break;
        case "help": DBOp_Help(); break;
        default:
            console.log("\n錯誤: 找不到指令或巨集。\n");
    }
}

/**
 * 資料庫指令操作中的「搜尋」。
 * @param {string} original 原始完整的指令碼。
 * @param {string[]} query 解析後的指令片段。
 */
function DBOp_Find(original, query) {
    let target = query[2];
    let condition = original.substr(original.indexOf(query[3]));

    // 若顯示目標為"schema"，則秀出所有的模板名稱。
    if (target == "schemas") {
        console.log("\n=============== 資料庫中所有的模板 ===============");
        for (let schemaName in DBModels) {
            console.log(schemaName);
        }
        console.log();
        return;
    }

    // 若使用者有輸入條件參數，則嘗試轉換成JSON物件；若無，則設定為空JSON物件。
    if (query[3] && condition.length > 0) {
        try {
            condition = JSON.parse(condition);
        }
        catch (err) {
            return console.log("\n條件參數格式錯誤，請寫下正確的JSON格式。\n");
        }
    }
    else {
        condition = {};
    }    

    // 再透過目標(target)找出指定的資料表。
    let model = DBModels[target];
    let index = 0, length;
    // 若目標的資料集合存在，則繼續下一步
    if (model) {

        // 先計算出目標資料有多少個
        model.count(condition, (err, count) => {
            length = count;
            // 若數量為0，則印出訊息表示找不到並返回
            if (length == 0) {
                console.log("\n指定尋找的資料不存在。\n");
                return;
            }

            /** 詢問使否連續觀看資料後的處理。 */
            function HandleIsContinue(line) {
                if (line == "Y" || line == "y") {
                    SearchAndShows();
                }
                else if (line == "N" || line == "n") {
                    CurrentOperationFunc = CommandRoutes;
                }
                else {
                    console.log("\n以下還有%s筆資料，是否再向下顯示10筆? (Y/N)\n", length - index);
                }
            }

            /** 循環尋找，並且將資料印出。 */
            function SearchAndShows() {
                model.find(condition)
                    .skip(index)
                    .limit(10)
                    .exec((err, docsList) => {
                        if (err) {
                            console.log("\n搜尋資料庫中的指定資料時發生了錯誤。請檢查是否有與MongoDB連線。\n");
                            CurrentOperationFunc = CommandRoutes;
                            return;
                        }
                        console.log();
                        console.log(docsList);      // 將資料印出
                        console.log();
                        index += 10;                // 推移10個量。

                        // 判斷是否全數顯示完成，若全數顯示完成，則將文字處理介面指回原先的處理函式。
                        if (index >= length) {
                            CurrentOperationFunc = CommandRoutes;
                        }
                        else {
                            console.log("\n以下還有%s筆資料，請問是否再向下顯示10筆? (Y/N)\n", length - index);
                            CurrentOperationFunc = HandleIsContinue;
                        }
                    }
                );
            }
            SearchAndShows();
        });
    }
    // 若不存在，則印出
    else {
        console.log("\n找不到指定的模板。\n");
    }
}

/**
 * 與使用者資料操作相關的功能。
 * @param {string[]} query 解析後的指令片段。
 */
function DBOp_User(query) {
    let operation = query[2];
    switch(operation) {
        case "list": DBOp_User_List(); break;
        default:
            console.log("\n錯誤: 找不到指令或巨集。\n");

    }
}
//#region Commands under "db user" operation.
/**
 * 將所有的使用者名稱以清單的方式列出。
 */
function DBOp_User_List() {
    let User = DBModels.User;
    // 先取得所有使用者名稱的數量
    User.count({}, (err, userCount) => {
        if (err) return console.log("\n向資料庫發送請求時發生了錯誤。請檢查是否有與MongoDB連線。\n");
        let index = 0;
        
        /** 是否繼續顯示使用者名稱。 */
        function HandleIsContinue(line) {
            if (line == "Y" || line == "y") {
                ShowUsernames();
            }
            else if (line == "N" || line == "n") {
                CurrentOperationFunc = CommandRoutes;
            }
            else {
                console.log("\n還有剩餘的%s筆資料尚未顯示出來，是否繼續向下顯示80筆? (Y/N)");
            }
        }

        /** 顯示使用者名稱。 */
        function ShowUsernames() {
            User.find({})
                .select("username")
                .skip(index)
                .limit(80)
                .exec((err, docsList) => {
                    if (err) {
                        console.log("\n資料庫搜尋資料時發生了錯誤。請檢查是否有與MongoDB連線。\n");
                        CurrentOperationFunc = CommandRoutes;
                        return;
                    }
                    // 將使用者資料有序的顯示出來
                    let length = docsList.length, spaceChar = ' ', formatSpace;
                    for (let i = 0; i < length; i++) {
                        formatSpace = 17 - docsList[i].username.length;
                        console.log("%s%s%s", docsList[i].username, spaceChar.repeat(formatSpace), i % 4 == 3 ? "\n" : "");
                    }
                    // 檢查是否還有剩餘的資料沒有顯示出來
                    index += 80;
                    if (index >= userCount) {
                        CurrentOperationFunc = CommandRoutes;
                    }
                    else {
                        console.log("\n還有剩餘的%s筆資料尚未顯示出來，是否繼續向下顯示80筆? (Y/N)");
                        CurrentOperationFunc = HandleIsContinue;
                    }
                }
            );
        }

    });
}
//#endregion

/** 
 *  查詢伺服器訊息指令"db"的相關操作用法。
 */
function DBOp_Help() {
    console.log("\ndb - 與資料庫操作有關的指令");
    console.log("db find <SchemaName | 'schemas'> [condition] : 尋找指定資料表中的資料，或列出所有的資料表名稱。");
    console.log("db user <operation> : 與使用者資料相關的操作。\n");
    console.log("db help : 查詢此指令的相關操作方式。\n");
}

//#endregion ======================================================================

//#region ============================= Restore Command =============================
/** 
 * 將整個JMuseum伺服器恢復的最初始、最原本的狀態。
 */
function ServerRestoreCommand() {
    let times = 3;
    /** 再三地確認是否要恢復JMuseum伺服器。 */
    function ConfirmRestore(line) {
        if (line == "Y" || line == "y") {
            times -= 1;
            if (times > 0) {
                console.log("\n是否確定要將JMuseum伺服器恢復到最初始的狀態? (Y/N) (為了確保非為輸入錯誤，因此會詢問 %s 次) ", times);
            }
            else {
                RESTORE_SERVER();
            }
        }
        else if (line == "N" || line == "n") {
            console.log();
            CurrentOperationFunc = CommandRoutes;
        }
        else {
            console.log("\n是否確定要將JMuseum伺服器恢復到最初始的狀態? (Y/N) (為了確保非為輸入錯誤，因此會詢問 %s 次)", times);
        }
    }

    console.log("\n是否確定要將JMuseum伺服器恢復到最初始的狀態? (Y/N) (為了確保非為輸入錯誤，因此會詢問 %s 次)", times);
    CurrentOperationFunc = ConfirmRestore;
}

//#endregion ========================================================================

//#region ============================== Help Command ==============================
/**
 * 打印出所有可用的指令種類。
 */
function HelpInformation() {
    console.log("\n所有可用的指令操作種類:");
    console.log("showstatus : 查看目前JMuseum伺服器的狀態。");
    console.log("       act : 繪圖藝廊活動有關的操作，如查看狀態、推進活動等等。");
    console.log("   servmsg : 伺服訊息有關的操作，如對使用者撰寫訊息、發起伺服廣播訊息等等。")
    console.log("        db : 資料庫操作相關的指令群，如搜尋、刪除、加入等等。");
    console.log("   restore : 將JMuseum伺服器回復到最初始的狀態。");
    console.log("      help : 查詢指令操作說明。");
    console.log("     .exit : 關閉JMuseum伺服器。\n");
}
//#endregion =======================================================================

//#region ============================== SERVER RESTORE ==============================
/**
 * 呼叫此函式會還原、回覆整個伺服器狀態與資料庫內的資料。
 */
function RESTORE_SERVER() {
    // 讀取還原預設資料檔案
    fileSystem.readFile(global.__dirname + "/db/restore_datas/restore_datas.json", { encoding: "utf8" }, (err, datas) => {
        if (err) {
            console.log("\n讀取還原之預設資料時發生了錯誤。請檢查在專案目錄之下的\"/db/restore_datas.json\"是否資料格式正確，或至Github上重新下載一個新的還原預設資料。\n");
            CurrentOperationFunc = CommandRoutes;
            return;
        }

        let restoreDatas = JSON.parse(datas);       // 取得原始資料

        CurrentOperationFunc = () => {};            // 先將輸入停止動作

        CLEAR_COLLECTIONS()                             // 先將資料庫中所有的資料清除
            .then(CREATE_RESTORING_DATAS(restoreDatas)) // 透過預設的資料來在資料庫中建立還原資料
            .then(CONNECT_RELATIVE_DATAS(restoreDatas)) // 將有關聯的資料做連結，並且儲存連結後的資料
            .then(RESTORE_PAINTING_IMAGES())            // 回復預設的繪圖影像資料
            .then(RESTORE_PUBLIC_IMAGES())              // 將公用的影像資料回復、刪除
            .then(RESTORE_SERVER_STATUS(restoreDatas))  // 回復伺服器狀態並儲存
            .then(SET_SEASON2_THEMES())                 // 設定第二季的活動與其中的主題資料
            .then(result => {                           // 最後所有動作完成時，依照結果result做印出、判斷
                if (result) {
                    console.log("\n伺服器還原完畢！\n");
                }
                else {
                    console.log("\nJMuseum伺服器還原失敗。請重新操作一次，或告知開發人員。\n");
                }
                CurrentOperationFunc = CommandRoutes;
            });
    });
}
//#region =============== Functions used by RESTORE_SERVER() ===============
/**
 * 將資料庫中所有資料清除。
 * @return {Promise} 讓外頭的函式可以繼續執行下一步。
 */
function CLEAR_COLLECTIONS() {
    let emptyCondition = {};
    /** 發生錯誤的時候的處理。 */
    function OnError(error) {
        console.log("\n清除資料庫中所有資料時發生了錯誤。請檢查是否有與MongoDB連線。\n");
        return false;
    }

    return DBModels.User.remove(emptyCondition).exec()
        .then(result => result ? DBModels.Painting.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.Season.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.Theme.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.Participation.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.Comment.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.ParticipantInfo.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.Rating.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.SiteMessage.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.SiteMail.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.ServerMessage.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.PaintingSpotlight.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? DBModels.NewTheme.remove(emptyCondition).exec() : false, OnError)
        .then(result => result ? mongoose.connection.collection("sessions").remove(emptyCondition) : false, OnError)
        .then(result => result ? Promise.resolve(true) : false , OnError);
}

/***
 * 建立回復伺服器的基本資料。
 * @param {Object} restoreDatas 回復伺服器時所用的資料。
 * @return {Function => Promise} Promise物件。
 */
function CREATE_RESTORING_DATAS(restoreDatas) {
    /** 發生錯誤時的處理函式。 */
    function OnError(error) {
        console.log("\n在建立回復伺服器之基本資料時發生了錯誤。請檢查是否有連接上MongoDB。\n");
        return false;
    }
    
    return function (result) {
        if (!result) return false;
        return DBModels.User.insertMany(restoreDatas.User)
            .then(result => result ? DBModels.Painting.insertMany(restoreDatas.Painting) : false, OnError)
            .then(result => result ? DBModels.Season.insertMany(restoreDatas.Season) : false, OnError)
            .then(result => result ? DBModels.Theme.insertMany(restoreDatas.Theme) : false, OnError)
            .then(result => result ? DBModels.ParticipantInfo.insertMany(restoreDatas.ParticipantInfo) : false, OnError)
            .then(result => result ? DBModels.Participation.insertMany(restoreDatas.Participation) : false, OnError)
            .then(result => result ? DBModels.PaintingSpotlight.insertMany(restoreDatas.PaintingSpotlight) : false, OnError)
            .then(result => result ? DBModels.ServerMessage.insertMany(restoreDatas.ServerMessage) : false, OnError)
    }
}

/**
 * 將有關的回復資料做連結。
 * @param {Object} restoreDatas 回復伺服器時所用的資料。
 * @return {Function => Promise} Promise物件。
 */
function CONNECT_RELATIVE_DATAS(restoreData) {
    /** 當讀取資料庫之資料時發生錯誤的錯誤處理。 */
    function OnLoadError(error) {
        console.log("\n讀取資料庫中的資料時發生錯誤。請檢查是否有連接上MongoDB。\n");
        return false;
    }

    /** 當資料儲存時所發生的錯誤之錯誤處理。 */
    function OnSaveError(error) {
        console.log("\n將資料回存至資料庫時發生了錯誤。請檢查是否有連接上MongoDB。\n");
        return false;
    }

    // 將與使用者有關的繪圖、主頁訊息加入其中
    return function() {
        // 紀錄所有從資料庫中讀出的資料
        let userDocs, paintingDocs, seasonDocs, themeDocs;
        let participantInfoDocs, participationDocs, serverMessageDocs;
        let paintingsSpotlightDocs;

        return DBModels.User.find({}).select("username paintings siteMsg").exec()
            .then(docs => docs ? (userDocs = docs, DBModels.Painting.find({}).select("name artist activity").exec()) : false, OnLoadError)
            .then(docs => docs ? (paintingDocs = docs, DBModels.Season.findOne({}).select("themes").exec()) : false, OnLoadError)
            .then(docs => docs ? (seasonDocs = docs, DBModels.Theme.find({}).select("title participants").exec()) : false, OnLoadError)
            .then(docs => docs ? (themeDocs = docs, DBModels.ParticipantInfo.find({}).select("paintingName").exec()) : false, OnLoadError)
            .then(docs => docs ? (participantInfoDocs = docs, DBModels.Participation.find({}).select("themeName activityRank").exec()) : false, OnLoadError)
            .then(docs => docs ? (participationDocs = docs, DBModels.ServerMessage.findOne({}).select("_id").exec()) : false, OnLoadError)
            .then(docs => docs ? (serverMessageDocs = docs, DBModels.PaintingSpotlight.find({}).select("paintings").exec()) : false, OnLoadError)
            .then(docs => docs ? (paintingsSpotlightDocs = docs, true) : false, OnLoadError)
            .then(result => {
                if (!result) return false;
                // 建立新的主頁訊息資料，並將其主頁資料加入到使用者資料中
                let userMap = {}, paintingMap = {}, themeMap = {};
                let newSiteMessage = { isServerMessage: true, refId: serverMessageDocs._id, postTime: new Date(), isSeen: true, isPrivate: false };
                userDocs.forEach((docs, index, list) => { 
                    userMap[list[index].username] = docs;
                    docs.siteMsg.push(newSiteMessage);
                });
                
                // 將圖畫_id連結到使用者資料中
                paintingDocs.forEach((docs) => { 
                    userMap[docs.artist].paintings.push(docs._id);
                    paintingMap[docs.name] = docs;
                });
                
                // 將 Participation 資料連結到 Painting 資料上
                participationDocs.forEach((docs) => {
                    if (docs.activityRank == 1) {
                        switch(docs.themeName) {
                            case "JMuseum":     paintingMap["Your JMuseum"].activity = docs._id;    break;
                            case "Night View":  paintingMap["The Night Sky"].activity = docs._id;   break;
                            default:            paintingMap["Bubbles"].activity = docs._id;         break;
                        }
                    }
                    else if (docs.activityRank == 2) {
                        switch(docs.themeName) {
                            case "JMuseum":     paintingMap["Our JMuseum!"].activity = docs._id;    break;
                            case "Night View":  paintingMap["Night City"].activity = docs._id;      break;
                            default:            paintingMap["Line and white"].activity = docs._id;  break;
                        }
                    }
                    else {
                        switch(docs.themeName) {
                            case "JMuseum":     paintingMap["JMuseum!"].activity = docs._id;                break;
                            case "Night View":  paintingMap["Night Light Raining"].activity = docs._id;     break;
                            default:            paintingMap["Spirits and devils eye"].activity = docs._id;  break;
                        }
                    }
                });

                // 將 JMuseum 的三個作品之_id連結到 PaintingSpotlight 資料上
                paintingsSpotlightDocs.forEach((docs) => { 
                    docs.paintings = [paintingMap["JMuseum!"]._id, paintingMap["The Night Sky"]._id, paintingMap["Bubbles"]._id];
                });
                
                // 將所有 Theme 對應到 themeMap 上，並且將每個的_id連結到 Season 資料上
                seasonDocs.themes = themeDocs.map((docs) => {
                    themeMap[docs.title] = docs;
                    return docs._id;
                });

                // 將指定的參加訊息(ParticipantInfo)資料連接到 Theme 之中
                participantInfoDocs.forEach((docs) => {
                    switch(docs.paintingName) {
                        case "Your JMuseum":
                        case "Our JMuseum!":
                        case "JMuseum!":
                            themeMap["JMuseum"].participants.push(docs._id);
                            break;
                        case "The Night Sky":
                        case "Night City":
                        case "Night Light Raining":
                            themeMap["Night View"].participants.push(docs._id);
                            break;
                        case "Bubbles":
                        case "Line and white":
                        case "Spirits and devils eye":
                            themeMap["Abstract Art"].participants.push(docs._id);
                    }
                });

                // 將「伺服歡迎訊息」記錄到restoreDatas
                restoreData.welcomeServMsgId = serverMessageDocs._id;

                return true;
            })
            .then(result => result ? DBModels.User.bulkWrite(userDocs.map(docs => { return { updateOne: { "filter": { _id: docs._id }, "update": { paintings: docs.paintings, siteMsg: docs.siteMsg } } }; })) : false)
            .then(result => result ? DBModels.Painting.bulkWrite(paintingDocs.map(docs => { return { updateOne: { "filter": { _id: docs._id }, "update": { activity: docs.activity } } }; })) : false, OnSaveError)
            .then(result => result ? seasonDocs.save() : false, OnSaveError)
            .then(result => result ? DBModels.Theme.bulkWrite(themeDocs.map(docs => { return { updateOne: { "filter": { _id: docs._id}, "update": { participants: docs.participants } } }; })) : false, OnSaveError)
            .then(result => result ? DBModels.PaintingSpotlight.bulkWrite(paintingsSpotlightDocs.map(docs => { return { updateOne: { "filter": { _id: docs._id }, "update": { paintings: docs.paintings } } }; })) : false, OnSaveError)
            .then(result => result ? true : false, OnSaveError);
    }
}

/**
 * 還原預設的圖畫影像資料。
 */
function RESTORE_PAINTING_IMAGES() {
    return function (result) {
        if (!result) return false;   // 若在前幾步驟的操作中已經失敗，則直接回傳false。

        let paintingDir = global.__dirname + "/db/paintings";                       // 存放畫作影像的路徑
        let restorePaintingDir = global.__dirname + "/db/restore_datas/paintings";  // 

        /** 刪除所有在目錄 "/db/paintings" 之下的繪圖檔案 */
        function DeleteAllPaintings(res, rej) {
            // 刪除在專案目錄之下，"/db/paintings"資料夾之下的所有資料
            fileSystem.readdir(paintingDir, (err, files) => {
                if (err) {
                    console.log("在刪除目錄 \"/db/paintings\"之下的所有檔案時發生了錯誤。請再重試一次操作。");
                    res(false);
                    return;
                }
                let index = 0, length = files.length;   // 刪除檔案的索引值 與 檔案數

                /** 連續地刪除目錄下的所有檔案。 */
                function DeleteFile(err) {
                    // 錯誤發生時的處理。
                    if (err) {
                        console.log("刪除檔案時發生了錯誤。請再重新試一次操作。");
                        res(false);
                    }
                    // 所有檔案尚未刪除完畢時，繼續向下刪除
                    else if (index < length) {
                        fileSystem.unlink(paintingDir + "/" + files[index], DeleteFile);
                        index += 1;
                    }
                    // 刪除完檔案時，回應true表示可以繼續下一步驟。
                    else {
                        res(true);
                    }
                }

                DeleteFile();
            });
        }

        /** 將預設的還原圖畫圖片複製到目錄 "/db/paintings" 之下。 */
        function CopyDefaultPaintings(res, rej) {
            // 讀取預設的所有還原圖畫檔案的檔案名稱。
            fileSystem.readdir(restorePaintingDir, (err, files) => {
                if (err) {
                    console.log("讀取預設的還原圖畫檔案目錄時發生了錯誤。請再重試操作一次。");
                    res(false);
                    return;
                }
                
                let index = 0, length = files.length;
                /** 循環地複製指定的資料。 */
                function CopyFile(err) {
                    if (err) {                      // 若發生錯誤時，印出錯誤並回調false
                        console.log("將還原的圖畫檔案複製至db資料夾中時發生了錯誤。請再重新操作一次。");
                        res(false);
                    }
                    else if (index < length) {      // 
                        fileSystem.copyFile(restorePaintingDir + "/" + files[index], paintingDir + "/" + files[index], CopyFile)
                        index += 1;
                    }
                    else {
                        res(true);
                    }
                }
                
                CopyFile();
            });
        }

        return (new Promise(DeleteAllPaintings))
            .then(result => result ? new Promise(CopyDefaultPaintings) : false)
            .then(result => result ? true : false);
    }
}

/** 
 * 回復所有的公用(public)圖片檔案。
 * @return {Promise} Promise物件。
 */
function RESTORE_PUBLIC_IMAGES() {
    return function (result) {
        if (!result) return false;

        let imagesDir = global.__dirname + "/public/images";

        /** 刪除所有活動的圖畫影像檔案。(除了第一季) */
        function DeleteSeasonsPaintings(res, rej) {
            let seasonDir = imagesDir + "/seasons";

            // 取得所有活動季目錄名稱
            fileSystem.readdir(seasonDir, (err, dirNames) => {
                if (err) {
                    console.log("\n讀取目錄\"%s\"之下所有子目錄名稱時發生了錯誤。請再重試一次。\n", seasonDir);
                    res(false);
                    return;
                }

                dirNames = dirNames.filter(name => name != "1");        // 把第一季的活動圖片保留
                let seasonIndex = 0, seasonLength = dirNames.length;
                
                // 循每一季的目錄去做刪除檔案的動作
                function ForEachSeasonDir(err) {
                    if (err) {
                        console.log("刪除目錄\"%s\"時發生了錯誤。請再重新操作一次。", seasonDir + "/" + dirNames[seasonIndex - 1]);
                        res(false);
                    }
                    else if (seasonIndex < seasonLength && dirNames[seasonIndex].substr(0,1) != ".") { // 若仍有季目錄尚未執行目錄下檔案刪除動作且不為系統資料夾，則繼續執行
                        let subSeasonDir = seasonDir + "/" + dirNames[seasonIndex];

                        // 刪除當前的季目錄。 刪除成功後，再次呼叫ForEachSeasonDir。
                        function DeleteDir() {
                            fileSystem.rmdir(subSeasonDir, ForEachSeasonDir);
                        }

                        // 取得指定一季的目錄之下的所有檔案名稱
                        fileSystem.readdir(subSeasonDir, (err, fileNames) => {
                            if (err) {
                                console.log("\n在目錄\"%s\"之下刪除活動的繪圖影像檔案時發生了錯誤。請再重試一次。\n", subSeasonDir);
                                res(false);
                                return;
                            }

                            let index = 0, length = fileNames.length;
                            // 刪除目錄之下的所有檔案
                            function DeleteFiles(err) {
                                if (err) {
                                    console.log("\n在目錄\"%s\"之下刪除活動的繪圖影像檔案時發生了錯誤。請再重試一次。\n", subSeasonDir);
                                    res(false);
                                }
                                else if (index < length) {  // 若還有檔案，則繼續刪除
                                    fileSystem.unlink(subSeasonDir + "/" + fileNames[index], DeleteFile);
                                    index += 1;
                                }
                                else {                      // 若當前目錄下的檔案皆已刪除，則呼叫 DeleteDir() 刪除當前的季目錄。
                                    DeleteDir();
                                }
                            }

                            DeleteFiles();
                        });

                        seasonIndex += 1;
                    }
                    else {      // 若所有季目錄都執行完目錄下的檔案刪除動作，則回調true值表示成功。
                        res(true);
                    }
                }

                ForEachSeasonDir();
            });
        }

        /** 刪除所有候選主題的圖像檔案。 */
        function DeleteNewThemeImages(res, rej) {
            let newThemeDir = imagesDir + "/newtheme";
            // 讀取在候選主題圖像目錄之下的所有檔案名稱
            fileSystem.readdir(newThemeDir, (err, fileNames) => {
                if (err) {
                    console.log("\n讀取目錄\"%s\"之下的所有檔案名稱時發生了錯誤。請再重新操作一次。\n", newThemeDir);
                    res(false);
                    return;
                }

                let index = 0, length = fileNames.length;
                // 刪除候選主題圖像目錄之下的檔案。
                function DeleteFile(err) {
                    if (err) {                  // 若有錯誤，則印出錯誤訊息並
                        console.log("\n刪除在目錄\"%s\"之下的檔案時發生了錯誤。請再重新操作一次。\n", newThemeDir);
                        res(false);
                    }
                    else if (index < length) {
                        fileSystem.unlink(newThemeDir + "/" + fileNames[index], DeleteFile);
                        index += 1;
                    }
                    else {
                        res(true);
                    }
                }

                DeleteFile();
            });
        }

        /** 刪除所有使用者的頭像影像檔案。 */
        function DeleteUserPhotos(res, rej) {
            let userPhotosDir = imagesDir + "/user_photos";
            // 取得所有在使用者頭像目錄之下的所有檔案名稱
            fileSystem.readdir(userPhotosDir, (err, fileNames) => {
                if (err) {
                    console.log("\n在取得目錄\"%s\"之下所有檔案名稱時發生了錯誤。請再重新操作一次。\n", userPhotosDir);
                    res(false);
                    return;
                }

                let index = 0, length = fileNames.length;
                // 循檔案名稱序來逐一刪除目錄下的所有影像檔案
                function DeleteFile(err) {
                    if (err) {                  // 若有錯誤，則將錯誤訊息印出並回調false值表示執行失敗。
                        console.log("\n在目錄\"%s\"之下刪除檔案時發生了錯誤。請再重新操作一次。\n", userPhotosDir);
                        res(false);
                    }
                    else if (index < length) {  // 若尚未刪除完所有影像檔案，則繼續執行刪除動作
                        fileSystem.unlink(userPhotosDir + "/" + fileNames[index], DeleteFile);
                        index += 1;
                    }
                    else {                      // 若全數刪除完畢，則回調true表示動作成功
                        res(true);
                    }
                }

                DeleteFile();
            });
        }

        return (new Promise(DeleteSeasonsPaintings))
            .then(result => result ? new Promise(DeleteNewThemeImages) : false)
            .then(result => result ? new Promise(DeleteUserPhotos) : false);
    }
}

/**
 * 還原伺服器狀態資料。
 * @param {Object} restoreData 還原的預設資料。
 * @return {Function} 一個回傳Promise物件的中介函式。若傳入的結果(result)為否，則函式回傳false。
 */
function RESTORE_SERVER_STATUS(restoreData) {
    return function (result) {
        if (!result) return false;
        ServerStatus.status = restoreData.ServerStatus;
        return ServerStatus.SaveStatus().catch(err => { console.log("\n儲存伺服器狀態檔案時發生了錯誤。請稍候再嘗試一次。\n"); return false; });
    }
}

/** 
 * 隨機的選取五個活動來建立第二季活動。
 */
function SET_SEASON2_THEMES() {
    return function (result) {
        if (!result) return false;

        // 從預設的主題資料中隨機取得5個主題資料來新增至資料庫中
        function SetSeason2Themes(res, rej) {
            fileSystem.readFile(global.__dirname + "/db/default_themes.json", { encoding: "utf8" }, (err, datas) => {
                if (err) {
                    console.log("\n取得預設的主題資料檔案時發生了錯誤。請確認該檔案是否存在，或重新下載預設主題資料檔案。\n");
                    res(false);
                    return;
                }

                // 嘗試將資料轉換成物件(JSON)
                let themeDatas;
                try {
                    themeDatas = JSON.parse(datas);
                }
                catch(err) {
                    console.log("\n轉換預設主題的資料至JSON物件時發生了錯誤。請確認該資料格式是否正確，或重新下載預設主題資料檔案。\n");
                    return;
                }

                // 不重複隨機抽五個預設的主題
                let pickedThemes = [];
                let length = themeDatas.length;
                let rndIndex;
                for (let i = 0; i < 5; i++) {
                    rndIndex = Math.floor(Math.random() * (length - i));
                    pickedThemes.push(themeDatas[rndIndex]);
                    [themeDatas[length - i - 1], themeDatas[rndIndex]] = [themeDatas[rndIndex], themeDatas[length - i - 1]];
                }
    
                // 將隨機取出來的主題資料，轉為新增主題資料時的必備資料(NewThemeData)
                let newThemeDatas = pickedThemes.map((theme, index) => {
                    return { order: index,
                             title: theme.title,
                             narrative: theme.narrative,
                             image: theme.image,
                             originator: theme.sponsor,
                             participants: [],
                             views: 0,
                             commentCount: 0 };
                });

                // 將這些新資料加入至資料庫中
                DBModels.Theme.insertMany(newThemeDatas).then(
                    themeDocs => {
                        let newSeasonData = { nth: 2, themes: themeDocs.map(docs => docs._id), startTime: new Date(), endTime: null };
                        let newSeasonDocs = DBModels.Season(newSeasonData);
                        // 將新的資料儲存
                        newSeasonDocs.save(err => {
                            if (err) {
                                console.log("\n儲存第二季活動資料時發生了錯誤。請確認是否有連接至MongoDB。\n");
                                res(false);
                            }
                            else {
                                res(true);
                            }
                        });
                    },
                    error => {
                        console.log("\n將新的主題資料儲存至資料庫時發生了錯誤。請確認是否有連接至MongoDB。\n");
                        res(false);
                    }
                );
            });
        }

        return new Promise(SetSeason2Themes);
    };
}
//#endregion ===============================================================

//#endregion =========================================================================

//#region =============================== Test Command ===============================
/** 
 * 測試用的指令動作。
 */
function Test() {
    
}


//#endregion =========================================================================

module.exports = Init;