let alertMessage;

$(init);

function init() {
    $("button#btnSend").on("click", btnSend_Click);
    alertMessage = $("#alertMessage");
}

/**
 * 當btnSend點擊後的動作。
 */
function btnSend_Click() {
    let data = {
        recipient: $("input#txtRecipient").val(),
        subject: $("input#txtSubject").val(),
        content: $("textarea#txtaContent").val(),
        isPrivate: $("input#chkPrivate:checked").length > 0
    };
    $.ajax({
        url: "/write_message",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data)
    }).then(ServerRespone).catch(SendMessage_OnError);
}

/**
 * 伺服器的回應。
 * @param {Object} response 伺服端回應的訊息物件。
 */
function ServerRespone(response) {
    if (response.isOK) {
        window.location.replace(response.url);
    }
    else {
        alertMessage.empty();
        alertMessage.append("<div class='alert alert-danger'>" + response.message + "</div>");
    }
}

/**
 * 當資料無法傳送至伺服器時的錯誤處理。
 * @param {jqXHR} jqXHR XMLHttpRequest.
 * @param {string} textStatus 錯誤名稱。
 * @param {string} err 錯誤敘述。
 */
function SendMessage_OnError(jqXHR, textStatus, err) {
    alertMessage.empty();
    if (textStatus == "timeout") {
        alertMessage.append("<div class='alert alert-danger'>伺服器忙碌中，請稍後再嘗試。</div>");
    }
    else {
        alertMessage.append("<div class='alert alert-danger'>無法將資料傳送至伺服端，請稍後再嘗試。</div>");
    }
}