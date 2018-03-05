let msgAlert = $("#msgAlert");

$("#chkAutoSaveEnable").change(chkAutoSaveEnable_Change);
$("#btnSaveSettings").on("click", btnSaveSettings_Click);

/**
 * 在「設定」之下，按下開關「自動啟用繪圖『自動儲存』」的事件處理。
 * @param {Event} e 事件物件。
 */
function chkAutoSaveEnable_Change(e) {
    autoSaveEnable = !autoSaveEnable;
}

/**
 * 按下「儲存設定」按鈕時事件處理。
 * @param {Event} e 事件物件。
 */
function btnSaveSettings_Click(e) {
    msgAlert.empty();
    $.ajax({
        url: "/home/option",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ autoSaveEnable }),
        timeout: 5000
    })
    .then(response => {
        if (response.isOK) {
            msgAlert.append("<div class='alert alert-success'>您的設定資料已經儲存成功！</div>");
        }
        else {
            msgAlert.append("<div class='alert alert-danger'>" + response.message + "</div>");
        }
        setTimeout(() => msgAlert.empty(), 10000);
    })
    .catch((jqXHR, textStatus, error) => {
        msgAlert.append("<div class='alert alert-danger'>將資料傳送至伺服端時發生了錯誤，請稍後再嘗試。</div>");
        setTimeout(() => msgAlert.empty(), 10000);
    });
}