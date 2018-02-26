
/**
 * 設定轉跳訊息頁面下的插值處理。
 * @param {BasicLayout} renderData 插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function MessageFormRender(renderData, route, session, callback) {
    switch(true) {
        case route == "/signupmsg":                     // 註冊成功的轉跳頁面
            renderData.datas.title = "註冊成功!";
            renderData.datas.content = "您現在可以用您所註冊的帳號登入了!";
            renderData.datas.button1 = "登入";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/login'));";
            break;
        case route.includes("/homenotexist/"):          // 在「個人頁面」下找不到目標使用者時的轉跳頁面
            // 確認使用者名稱存在於路徑中
            if (route.length > 14) {
                let username = route.substr(14);        // 取得找不到的「使用者名稱」
                renderData.datas.title = "找不到 “" + username + "” 的個人頁面！"
            }
            else {
                renderData.datas.title = "找不到指定使用者的個人頁面！";
            }
            renderData.datas.content = "很抱歉，您所尋找的使用者並不存在！";
            renderData.datas.button1 = "首頁";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/'));";
            break;
            
        case route == "/personalinfo_updated":          // 在「編輯個人資料」頁面下，成功編輯個人資料後的跳轉提示頁面
            renderData.datas.title = "個人資料修改成功！";
            renderData.datas.content = "您的個人資料已成功更新！";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/home/" + renderData.username + "'));";
            break;

        case route == "/send_sitemail_successfully":    // 在「撰寫站內訊息」頁面下，成功編輯個人資料後的轉跳頁面。
            renderData.datas.title = "站內信發送成功！";
            renderData.datas.content = "您的站內信件已成功寄送！";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/home/" + renderData.username + "'));";
            break;
        case route == "/newpw_success":                 // 在「更變密碼」頁面下，成功更改密碼後的轉跳頁面。
            renderData.datas.title = "密碼更改成功！";
            renderData.datas.content = "您的密碼已經更改成功！";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/home/" + renderData.username + "'));";
            break;
        case route == "/painting_finished":             // 在「繪圖創作」頁面下，成功完成畫作之後的跳轉頁面。
            renderData.datas.title = "作品已完成！";
            renderData.datas.content = "您的畫作已經完成，您可以返回去欣賞您的畫作！";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/home/" + renderData.username + "'));";
            break;
        case route == "/painting_not_exist":            // 在找不到指定的圖畫作品之下的跳轉頁面
            renderData.datas.title = "找不到您的圖畫作品！";
            renderData.datas.content = "請確認您所指定的圖畫作品是否所屬於您，或是該作品是否存在。";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/home/" + renderData.username + "'));";
            break;
        case route == "/painting_deleted":              // 成功刪除指定圖畫作品後的跳轉頁面
            renderData.datas.title = "圖畫作品刪除成功！";
            renderData.datas.content = "您指定的圖畫作品已刪除成功！" + (session.paintingDeleted_Activity ? "請注意，投稿至活動上的圖畫不會被刪除！" : "");
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/home/" + renderData.username + "'));";
            // 若有被標記，則刪除paintingDeleted_Activity
            if (session.paintingDeleted_Activity)
                delete session.paintingDeleted_Activity;
            break;
        case route == "/newtheme/successful":           // 當成功處理了「投稿新主題」後的轉跳頁面
            renderData.datas.title = "新主題投稿成功！";
            renderData.datas.content = "您所投稿的新主題已成功地上傳！請等待最新一季的結果。";
            renderData.datas.button1 = "返回首頁";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/'));";
            break;
        case route == "/newtheme":                      // 當使用者在「投稿主題」路由上，但卻已經有投稿過主題的轉跳頁面
            renderData.datas.title = "您已經投稿過新主題了！";
            renderData.datas.content = "請等待下一次的「投稿主題」活動再進行發起主題的動作！。";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.history.back() );";
            break;
        case route == "/votetheme/success":             // 當成功處理了「主題票選」後的轉跳頁面
            renderData.datas.title = "候選主題投票成功！";
            renderData.datas.content = "您的投票資料已經成功送出！請等待下一次的主題投票。";
            renderData.datas.button1 = "返回首頁";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.location.replace('/'));";
            break;
        case route == "/votetheme":                     // 當使用者在「主題票選」路由上，但卻已經有票選過主題之後的跳轉頁面
            renderData.datas.title = "您已經對候選主題票選過了！";
            renderData.datas.content = "請等待下一次的「主題票選」活動再進行主題票選的動作！";
            renderData.datas.button1 = "返回";
            renderData.datas.script = "$('#btnAction1').on('click', () => window.history.back() );";
            break;
        default:                        // 其他未定義的伺服器訊息
            return callback(new Error("未定義的對應伺服訊息插值資料。"), null);
    }
    return callback(false, true);
}

module.exports.Render = MessageFormRender;