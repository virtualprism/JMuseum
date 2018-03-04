let txtSubject = $("txtSubject");
let txtaContent = $("txtaContent");
let msgAlert = $("msgAlert");

$("#btnFeedback").on("click", btnFeedback_Click);

function btnFeedback_Click(e) {
    let data = { title: txtSubject.val(), content: txtaContent.val() };
    $.ajax({
        url: "/feedback",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        timeout: 10000,
        success: PostFeedback_OnError,
        error: PostFeedback_OnError
    });
}

/**
 * 當伺服端成功處理完回饋資料後的回應處理。
 * @param {Object} response 伺服端的回應資料。
 */
function PostFeedback_Response(response) {
    if (response.isOK) {
        window.location.replace(response.url);
    }
    else {
        $("#msgAlert").empty();
        $("#msgAlert").append("<div class='alert alert-danger'>" + response.message + "</div>");
    }
}

/**
 * 當回饋資料無法傳送至伺服器時的處理。
 * @param {jqXHR} jqXHR JQuery的XMLHttpRequest物件。
 * @param {string} textStatus 錯誤的名稱。
 * @param {string} error 錯誤的描述。
 */
function PostFeedback_OnError(jqXHR, textStatus, error) {
    $("#msgAlert").empty();
    $("#msgAlert").append("<div class='alert alert-danger'>無法將資料傳送至伺服端，請稍候再嘗試。</div>");
}