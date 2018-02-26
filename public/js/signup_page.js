let divErrorMessages = $("div#divErrorMessages");
let txtLName = $("input#txtLName");
let txtFName = $("input#txtFName");
let txtEmail = $("input#txtEmail");
let txtUsername = $("input#txtUsername");
let txtPassword = $("input#txtPassword");
let txtConPassword = $("input#txtConPassword");

let vldLName = /^[a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16}$/;
let vldFName = /^([a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16})([\ ]*)([a-zA-Z]{0,16})$/;
let vldEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
let vldUsername = /^([a-zA-z]{1,1})([0-9a-zA-z]{3,15})$/;
let vldPassword = /(^[0-9a-zA-Z_?!@#+-]{5,16}$)/;

let formElements =
{
    "lastName": txtLName,
    "firstName": txtFName,
    "email": txtEmail,
    "username": txtUsername,
    "password": txtPassword,
    "confirmPassword": txtConPassword
    // termsAgreement: 是否接受「JMuseum 條款」
};

//當使用者按下「註冊」按鈕時
$("button#btnSubmit").on("click", (e) => {
    e.preventDefault();
    var resultLName = vldLName.test(txtLName.val());
    var resultFName = vldFName.test(txtFName.val());
    var resultEmail = vldEmail.test(txtEmail.val());
    var resultUsername = vldUsername.test(txtUsername.val());
    var resultPassword = vldPassword.test(txtPassword.val());
    var resultConPassword = (txtConPassword.val().length > 0) && ( txtConPassword.val() == txtPassword.val() );
    iterativelyTagInputError(formElements, [resultLName, resultFName, resultEmail, resultUsername, resultPassword, resultConPassword]);
    
    switch (false) {
        case resultLName:
            showDangerAlert( txtLName.val().length == 0 ? "「姓」為必要輸入的欄位，請輸入您的大名。" : "「姓」欄位輸入錯誤，請輸入小於17字的英文或中文字。" );
            break;
        case resultFName:
            showDangerAlert( txtFName.val().length == 0 ? "「名」為必要輸入的欄位，請輸入您的大名。" : "「名」欄位輸入錯誤，請輸入小於33字的英文或中文字。" );
            break;
        case resultEmail:
            showDangerAlert( txtEmail.val().length == 0 ? "\"Email\"為必要輸入的欄位，請輸入您的信箱地址。" : "請在\"Email\"欄位中輸入正確的格式。");
            break;
        case resultUsername :
            if (txtUsername.val().length == 0) showDangerAlert("\"Username\"為必要輸入的欄位，請輸入您想要的帳號名稱。");
            else if ( /^[0-9]$/.test(txtUsername.val().substr(1, 1)) ) showDangerAlert("\"Username\"欄位中的第一字僅能為英文字母。");
            else showDangerAlert( "\"Username\"欄位中必須輸入大於3且小於16的數字或英文字母。" );
            break;
        case resultPassword :
            showDangerAlert( txtPassword.val().length == 0 ? "\"Password\"為必要輸入的欄位，請輸入您想要的密碼，長度限為5~16字。" : "\"Password\"欄位中必須輸入數字、英文字母或「_?!@#+-」中任一字元。");
            break;
        case resultConPassword :
            showDangerAlert( txtConPassword.val().length == 0 ? "\"Confirm Password\"為必要輸入的欄位，請再次\"Password\"欄位中的密碼。" : "請在\"Confirm Password\"欄位中輸入與\"Password\"欄位中相符的密碼。" );
            break;
        default:
            if ($("input#chkJMuseumTerms:checked").length > 0) {
                sendInformation();
            } else {
                showDangerAlert("請勾選表示同意「JMuseum 條款」");
            }
            break;
    }
});

//傳送資料至伺服端
function sendInformation() {
    var data = {    lastName : txtLName.val(), firstName : txtFName.val(), email : txtEmail.val(),
                    username : txtUsername.val(), password : txtPassword.val(), confirmPassword : txtConPassword.val(),
                    termsAgreement : ($("input#chkJMuseumTerms:checked").length > 0) };
    $.ajax( {
        url : "/newmembersignup",
        method : "POST",
        contentType : "application/json",
        data : JSON.stringify(data),
        success : serverRespone
    });
}

/**
 * 接收伺服器回應
 * @param {Object} respone 伺服器的訊息回應物件。
 */
function serverRespone(respone) {
    // 若伺服器回應「驗證通過」，則轉跳到目標網頁位置
    if (respone.isOK) {
        window.location.replace(respone.redirect);
    }
    // 若驗證不通過，則印出錯誤訊息與其相關的欄位。
    else{
        setServerErrorMessage(respone.field, respone.message);
    }
}

/**
 * 設置由伺服端傳來的錯誤訊息
 * @param {String} field   指定的錯誤訊息欄位。
 * @param {String} message 由伺服器端回應的錯誤訊息。
 */
function setServerErrorMessage(field, message) {
    // 先清除所有的錯誤標記
    for (let prop in formElements)
        formElements[prop].parent().removeClass("has-error");
    // 若錯誤的欄位在表單元素清單中(Form Elements)，則標記錯誤
    if (field in formElements) {
        formElements[field].parent().addClass("has-error");
    }
    showDangerAlert(message);
}

//疊代檢查每一對input是否檢查正確，若正確則正常顯示；若不正確則加上紅色邊框效果
function iterativelyTagInputError(elements, validationResults) {
    let elemList = Object.values(elements);
    for (let i = 0; i < elemList.length; i++)
        tagInputError(elemList[i], validationResults[i]);
}

//是否標示指定輸入方塊為「輸入錯誤」
function tagInputError(element, validationResult) {
    if (validationResult) {
        element.parent().removeClass("has-error");
    }
    else if (!element.parent().hasClass("has-error")) {
        element.parent().addClass("has-error");
    }
}

// 顯示錯誤資訊
function showDangerAlert(message) {
    var alert = $("<div id='divDangerAlert'></div>").attr("role", "alert").addClass("alert alert-danger").text(message);
    divErrorMessages.children("#divDangerAlert").remove();
    divErrorMessages.append(alert);
}

// 測試用的驗證成功訊息
function testSuccessMsg() {
    var alert = $("<div id='divDangerAlert'></div>").attr("role", "alert").addClass("alert alert-success").text("驗證成功");
    divErrorMessages.children("#divDangerAlert").remove();
    divErrorMessages.append(alert);
}