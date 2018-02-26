let selections = [];

$("input.btn-selection").on("click", btnTheme_Click);
$("#btnSubmit").on("click", btnSubmit_Click);

function setAlert(message) {
    if ($("#divAlert").children().length > 0)
        $("#divAlert").children().remove();
    if (message) {
        $("#divAlert").append($("<div class='alert alert-danger mt-20'>" + message + "</div>"));
    }
}

function btnTheme_Click(event) {
    event.stopPropagation();
    let target = event.target;
    let index = selections.indexOf(target.dataset.index);
    if ( index == -1 ) {
        if ( selections.length < maxSel ) {
            selections.push(target.dataset.index);
            $(target).addClass("btn-selected");
        }
    }
    else {
        $(target).removeClass("btn-selected");
        selections.splice(index, 1);
    }
}

function btnSubmit_Click() {
    if (selections.length != maxSel) {
        setAlert("請選擇" + maxSel + "個主題!");
        return;
    }
    let data = { selections: selections };
    $.ajax({
        url: "/votetheme",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: VoteTheme_ServerResponse,
        error: VoteTheme_OnError
    });
}

/**
 * 將票選資料成功傳送至伺服器後，伺服器所回應的訊息。
 * @param {Object} response 伺服端傳來的訊息。
 */
function VoteTheme_ServerResponse(response) {
    if (response.isOK) {
        window.location.replace(response.url);
    }
    else {
        setAlert("錯誤: " + response.message);
    }
}

/**
 * 當票選資料無法傳送至伺服器時的處理。
 * @param {jqXHR} jqXHR XMLHttpRequest物件。
 * @param {string} statusText 錯誤名稱。
 * @param {string} error 錯誤敘述。
 */
function VoteTheme_OnError(jsXHR, statusText, error) {
    setAlert("無法將資料傳送至伺服端，請稍後再嘗試。");
}