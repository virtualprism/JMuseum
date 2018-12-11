const URL = window.URL || webkit.URL;

var vldLName = /^[a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16}$/;
var vldFName = /^([a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16})([\ ]*)([a-zA-Z]{0,16})$/;
var vldNickname = /^([^<>\&"']{0,16})$/;
var vldMotto = /^([^<>\&"']{0,32})$/;

var txtLastName = $("#txtLastName");
var txtFirstName = $("#txtFirstName");
var txtNickname = $("#txtNickname");
var txtMotto = $("#txtMotto");

let formTextFields = {
    "lastName": txtLastName,
    "firstName": txtFirstName,
    "nickname": txtNickname,
    "motto": txtNickname
};

var divAlert = $("#divAlert");
var btnUploadImg = document.getElementById("btnUploadImg");

var imageFile = null;

$("#btnSave").on("click", btnSave_Click);
$("#btnUploadImg").on("change", btnUploadImg_Change);

/**
 * 當「儲存更變」按鈕按下時所做的處理。
 */
function btnSave_Click() {
    let resultLName = vldLName.test(txtLastName.val());
    let resultFName = vldFName.test(txtFirstName.val());
    let resultNickname = vldNickname.test(txtNickname.val());
    let resultMotto = vldMotto.test(txtMotto.val());
    iterativelySetInputState( [txtLastName, txtFirstName, txtNickname, txtMotto],
                              [resultLName, resultFName, resultNickname, resultMotto] );
    switch (false) {
        case resultLName:
            setAlert(txtLastName.val().length == 0 ? "「姓」為必要輸入的欄位，請輸入您的大名。" : "「姓」欄位輸入錯誤，請輸入小於17字的英文或中文字。");
            break;
        case resultFName:
            setAlert(txtFirstName.val().length == 0 ? "「名」為必要輸入的欄位，請輸入您的大名。" : "「名」欄位輸入錯誤，請輸入小於33字的英文或中文字。");
            break;
        case resultNickname:
            setAlert(txtNickname.val().length > 16 ? "暱稱欄位的字數至多16字元。" : "在暱稱欄位中請勿輸入非法字元: <>&\"\'");
            break;
        case resultMotto:
            setAlert(txtMotto.val().length > 32 ? "短言欄位的字數至多32字元。" : "在短言欄位中請勿輸入非法字元: <>&\"\'");
            break;
        default:
            setAlert(null);
            uploadDatas();
    }
}

/**
 * 上傳資料、檔案至伺服器。
 */
function uploadDatas() {
    let datas = new FormData();
    datas.append("lastName", txtLastName.val());
    datas.append("firstName", txtFirstName.val());
    datas.append("nickname", txtNickname.val());
    datas.append("motto", txtMotto.val());
    datas.append("photo", btnUploadImg.files[0]);
    $.ajax({
        url: "/save_personal_info",
        method: "POST",
        cache: false,
        processData: false,
        contentType: false,
        data: datas,
        timeout: 10000,
        success: serverResult,
        error: sendFailed
    });
}

/**
 * 上傳資料、檔案之後伺服器所給的回應。
 */
function serverResult(respone) {
    // 若成功，則跳轉至訊息頁面
    if (respone.isOK) {
        window.location.replace(respone.redirect);
        return;
    }
    // 若錯誤為伺服內部訊息或圖像檔案錯誤，則顯示在頁面上
    if (respone.field == "SERVER" || respone.field == "photo") {
        setAlert(respone.message);
        return;
    }
    // 若錯誤為文字資料，則標示指定的錯誤
    clearAllInputState();
    formTextFields[respone.field].addClass("has-error");
    setAlert(respone.message);
}

/**
 * 當資料無法傳送至伺服端時的失敗處理。
 * @param {Object} jqXHR 
 * @param {string} status 
 * @param {Object} error 
 */
function sendFailed(jqXHR, status, error) {
    alert(error);
}

/**
 * 清除所有狀態。
 */
function clearAllInputState() {
    formTextFields["lastName"].removeClass("has-error");
    formTextFields["firstName"].removeClass("has-error");
    formTextFields["nickname"].removeClass("has-error");
    formTextFields["motto"].removeClass("has-error");
}

/**
 * 根據驗證結果(results)來設定對應的DOM物件(elements)的屬性。
 * @param {DOMObject[]} elements 指定要設定的DOM物件。
 * @param {Boolean[]} results 驗證結果。
 */
function iterativelySetInputState(elements, results) {
    for(var i = 0; i < elements.length; i++)
        setInputState(elements[i], results[i]);
}

/**
 * 根據驗證結果(validatorResult)來設定指定DOM物件(element)的屬性。
 * @param {DOMObject} element 指定的DOM物件。
 * @param {Boolean} validatorResult 驗證結果。
 */
function setInputState(element, validatorResult) {
    if (validatorResult && element.hasClass("has-error")) {
        element.removeClass("has-error");
    }
    else if (!validatorResult && !element.hasClass("has-error")) {
        element.addClass("has-error");
    }
}

/**
 * 設定提示訊息。
 * @param {string} message 要顯示的提示訊息。若為空字串或null則不顯示。
 */
function setAlert(message) {
    divAlert.children().remove();
    if (message)
        divAlert.append("<div class='alert alert-danger mt-20'>" + message + "</div>");
}

/**
 * 選取影像檔案事件。
 * @param {DOMEvent} event DOM事件物件。檢查使用者所選的影像檔案是否符合規定，並記錄到imageFile中。
 */
function btnUploadImg_Change(event) {
    if (!btnUploadImg.files) {
        alert("讀取失敗: 您的瀏覽器不支援input元素中的files屬性。");
        return;
    }
    else if (!btnUploadImg.files[0]) {
        alert("讀取失敗: 請再完成之前選取您所要上傳的檔案。");
        return;
    }
    let file = btnUploadImg.files[0];
    if ( file.type != "image/jpeg" && file.type != "image/png" ) {
        alert("類型錯誤: 上傳的檔案類型請選擇jpg或png圖檔。");
        return;
    }
    else if ( file.size > 131072 ) {
        alert("大小錯誤: 上傳的圖檔大小請勿超過128KB。");
        return;
    }
    imageFile = file;
    $("#imgUserImg").attr("src", URL.createObjectURL(imageFile));
}