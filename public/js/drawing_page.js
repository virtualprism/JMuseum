let txtName = $("#txtName");                        // 作品名稱輸入框
let txtDescription = $("#txtDescription");          // 作品敘述輸入框
let tdCreatedTime = $("#tdCreatedTime");            // 作品「建立時間」訊息
let tdLastModified = $("#tdLastModified");          // 作品「最後修改時間」訊息
let divMessage = $("#divMessage");                  // 顯示訊息的區塊
let autoSaveTimerId;                                // 自動儲存的計數器的ID
var tagList;                                        // 紀錄使用者所選的標籤

// 集合了對話方塊所會用到的元件、方法
let msgDialog = {
    title: $("#msgDialog_title"),
    message: $("#msgDialog_message"),
    btnDelete: $('#btnDelete'),
    btnClose: $('#btnClose'),
    show: () => $("#msgDialog").modal("show")
};

window.onload = init;   // 初始化

$("#btnSavePainting").on("click", btnSavePainting_Click);                                       // 為「儲存畫作」按鈕按下事件簽署
$("#btnFinish").on("click", btnFinish_Click);                                                   // 為「完成畫作」按鈕按下事件簽署
$("#btnPreDelete").on("click", btnPreDelete_Click);                                             // 為「刪除畫作」按鈕按下事件簽署
$('#chkAutoSave').change(chkAutoSave_Click);                                                    // 為「自動儲存」開關狀態事件簽署
$("#msgDialog").on('hidden.bs.modal', () => { msgDialog.btnDelete.css("display", "none"); });   // 每次當對話框消失時，就將「刪除」按鈕做消失動作
msgDialog.btnDelete.on("click", btnDelete_Click);                                               // 為對話框裡的「刪除」按鈕按下事件簽署

/**
 * 初始化事件。
 */
function init() {
    //初始化所有標籤的動作
    tagList = $("div#tagPanel > div.labelTag");
    for ( var i = 0; i < tagList.length; i++) {
        tagList[i].check = false;
        tagList[i].addEventListener("click", labelTag_Click);
    }
    // 若有啟用自動儲存功能，則設定倒數計時Timer。
    if (autoSaveEnable)
        autoSaveTimerId = setTimeout(autoSavePainting, 180000);
}

/**
 * 使用者為作品選上標籤。
 * @param {DOMEvent} e 事件物件。
 */
function labelTag_Click(e) {
    var element = e.target;
    element.check ? element.classList.remove("active") : element.classList.add("active");
    element.check = !element.check;
}

/**
 * 取得作品觀賞權限的號碼。
 * @return {number} 觀賞權限相對應的代號。
 */
function getViewAuthorityNumber() {
    switch (true) {
        case $("#rdoPrivate.active").length > 0: return 2;
        case $("#rdoHalfPublic.active").length > 0: return 1;
        default: return 0;
    }
}

/**
 * 取得此作品有被標上標籤的所有標籤名稱清單。
 * @return {string[]} 此作品的標籤。
 */
function getPaintingTags() {
    let tagList = $("#tagPanel").children();
    let selectedTags = [];
    for (let i = 0; i < tagList.length; i++) {
        if (tagList[i].classList.contains("active"))
            selectedTags.push(tagList[i].innerText);
    }
    return selectedTags;
}

/**
 * 當使用者按下 btnSavePainting ，執行儲存畫作的動作。
 * @param {DOMEvent} e 事件物件。
 */
function btnSavePainting_Click(e) {
    let datas = {
        id: paintingId,                     // paintingId由Pug與DataRender端自動加入，在drawing.pug中。
        name: txtName.val(),
        description: txtDescription.val(),
        taglist: getPaintingTags(),
        view_authority: getViewAuthorityNumber(),
        painting_image: cvsCanvas.toDataURL("image/png")
    };
    $.ajax({
        url: "/drawing/save",
        method: "POST",
        cache: false,
        processData: false,
        contentType: "application/json",
        data: JSON.stringify(datas),
        success: SavePainting_ServerResponse,
        error: SavePainting_OnError
    });
}

/**
 * 將儲存畫作的資料傳送至伺服器後，從伺服端回應的訊息處理。
 * @param {Object} response 自伺服端送來的回應。
 */
function SavePainting_ServerResponse(response) {
    if (response.isOK) {
        msgDialog.title.text("訊息");
        msgDialog.message.text(response.message);       // 回應訊息
        tdLastModified.text(response.lastModified);     // 更新「最後修改時間」

        // 如果為新建立的畫作，則為「建立日期」欄位填上時間
        if (!paintingId) 
            tdCreatedTime.text(response.lastModified);
        
        paintingId = response.id;                       // 取得由伺服端回應的畫作Id
        $("#btnPreDelete").prop( "disabled", false);    // 啟用「刪除畫作」按鈕
    }
    else {
        msgDialog.title.text("錯誤");
        msgDialog.message.text(response.message);
    }
    msgDialog.btnClose.text("關閉");
    msgDialog.show();
}

/**
 * 當資料無法傳送至伺服端或處理失敗時的處理．
 * @param {jqXHR} jqXHR XMLHttpRequest物件。
 * @param {string} statusText 錯誤的名稱。
 * @param {string} err 錯誤訊息。
 */
function SavePainting_OnError(jqXHR, statusText, err) {
    msgDialog.title.text("資料傳送錯誤");
    msgDialog.message.text(`${statusText} : ${err}`);
    msgDialog.show();
}

/**
 * 當使用者按下「完成畫作」，告訴伺服端這幅作品已完成。
 * @param {DOMEvent} e 事件物件。
 */
function btnFinish_Click(e) {
    let datas = {
        id: paintingId,                     // paintingId由Pug與DataRender端自動加入，在drawing.pug中。
        name: txtName.val(),
        description: txtDescription.val(),
        taglist: getPaintingTags(),
        view_authority: getViewAuthorityNumber(),
        painting_image: cvsCanvas.toDataURL("image/png")
    };
    $.ajax({
        url: "/drawing/finish",
        method: "POST",
        cache: false,
        processData: false,
        contentType: "application/json",
        data: JSON.stringify(datas),
        success: FinishPainting_ServerResponse,
        error: FinishPainting_OnError
    });
}

/**
 * 將完成畫作訊息傳送至伺服端之後，從伺服端所接收的回應訊息。
 * @param {Object} response 從伺服端所接收的回應訊息。
 */
function FinishPainting_ServerResponse(response) {
    // 若成功，則跳轉到訊息頁面。
    if (response.isOK) {
        window.location.replace(response.url);
    }
    // 若不成功，則顯示訊息
    else {
        msgDialog.title.text("錯誤");
        msgDialog.message.text(response.message);
        msgDialog.btnClose.text("關閉");
        msgDialog.show();
    }
}

/**
 * 當資料無法傳送至伺服端或處理失敗時的處理．
 * @param {jqXHR} jqXHR XMLHttpRequest物件。
 * @param {string} statusText 錯誤的名稱。
 * @param {string} err 錯誤訊息。
 */
function FinishPainting_OnError(jqXHR, statusText, err) {
    msgDialog.title.text("資料傳送錯誤");
    msgDialog.message.text(`${statusText} : ${err}`);
    msgDialog.show();
}

/**
 * 當使用者按下「自動儲存」時，決定是否要每五分鐘就儲存此幅畫作。
 * @param {DOMEvent} e 事件物件。
 */
function chkAutoSave_Click(e) {
    autoSaveEnable = !autoSaveEnable;
    // 若啟用了「自動儲存」，則開始計時器，每隔一段時間自動儲存。
    if (autoSaveEnable) {
        autoSaveTimerId = setTimeout(autoSavePainting, 180000);
    }
    // 若無則清除
    else {
        clearTimeout(autoSaveTimerId);
    }
}

/**
 * 自動儲存畫作內容與資訊的函式。
 */
function autoSavePainting() {
    if (autoSaveEnable && paintingId) {
        let datas = {
            id: paintingId,                     // paintingId由Pug與DataRender端自動加入，在drawing.pug中。
            name: txtName.val(),
            description: txtDescription.val(),
            taglist: getPaintingTags(),
            view_authority: getViewAuthorityNumber(),
            painting_image: cvsCanvas.toDataURL("image/png")
        };
        $.ajax({
            url: "/drawing/autosave",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(datas),
            timeout: 10000,
            success: AutoSave_ServerResponse,
            error: AutoSave_OnError
        });
    }
    // 每3分鐘自動執行此函式。
    autoSaveTimerId = setTimeout(autoSavePainting, 180000);
}

/**
 * 自動儲存之後，接收來自伺服端的回應。
 * @param {Object} response 來自於伺服端的回應。
 */
function AutoSave_ServerResponse(response) {
    if (response.isOK) {
        tdLastModified.text(response.lastModified);
        divMessage.append("<div id='autoSaveMessage' class='alert alert-success text-center'>自動儲存：" + response.message + "</div>");
        paintingId = response.id;
    }
    else {
        divMessage.append("<div id='autoSaveMessage' class='alert alert-danger text-center'>自動儲存失敗：" + response.message + "</div>");
    }
    // 五秒後將訊息移除
    setTimeout(() => $("#autoSaveMessage").remove(), 5000);
}

/**
 * 當資料無法傳送至伺服器的時候，所做的處理。
 * @param {jqXHR} jqXHR JQuery的XMLHttpRequest物件。
 * @param {string} statusText 錯誤的名稱。
 * @param {string} err 錯誤訊息。
 */
function AutoSave_OnError(jqXHR, statusText, err) {
    divMessage.append("<div id='autoSaveMessage' class='alert alert-danger text-center'>自動儲存失敗：連線失敗，請稍後再嘗試。</div>");
    setTimeout(() => $("#autoSaveMessage").remove(), 5000);
}


/**
 * 當「動作」版面上的「刪除」按鈕按下後的事件處理。
 * @param {DOMEvent} e 事件物件。
 */
function btnPreDelete_Click(e) {
    msgDialog.title.text("確認刪除");
    msgDialog.message.text("確定要刪除此畫作?");
    msgDialog.btnDelete.css("display", "inline-block");
    msgDialog.btnClose.text("取消");
    msgDialog.show();
}

/**
 * 在對話方塊上的「刪除」按鈕按下後的事件處理。
 * @param {DOMEvent} e 事件物件。
 */
function btnDelete_Click(e) {
    let data = { id: paintingId };
    $.ajax({
        url: "/drawing/delete",
        method: "DELETE",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: DeletePainting_ServerResponse,
        error: DeletePainting_OnError
    });
}

/**
 * 執行「畫作刪除」動作之後，伺服器傳回的訊息。
 * @param {Object} response 接收自伺服端回應的訊息物件。
 */
function DeletePainting_ServerResponse(response) {
    if (response.isOK) {
        window.location.replace(response.url);
    }
    else {
        msgDialog.title.text("錯誤");
        msgDialog.message.text(response.message);
        msgDialog.btnClose.text("關閉");
        msgDialog.show();
    }
}

/**
 * 當資料無法傳送至伺服器的時候，所做的處理。
 * @param {jqXHR} jqXHR JQuery的XMLHttpRequest物件。
 * @param {string} statusText 錯誤的名稱。
 * @param {string} err 錯誤訊息。
 */
function DeletePainting_OnError(jqXHR, statusText, err) {
    msgDialog.title.text("資料傳送錯誤");
    msgDialog.message.text(`${statusText} : ${err}`);
    msgDialog.show();
}