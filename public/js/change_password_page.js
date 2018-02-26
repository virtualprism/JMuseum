var vldPassword = /(^[0-9a-zA-Z_?!@#+-]{5,16}$)/;

var txtOldPassword = $("#txtOldPassword");
var txtNewPassword = $("#txtNewPassword");
var txtConfirmNewPassword = $("#txtConfirmNewPassword");
var divAlert = $("#divAlert");

$("#btnSubmit").on("click", btnSubmit_Click);

function btnSubmit_Click(e) {
    e.preventDefault();
    let resultOldPassword = vldPassword.test(txtOldPassword.val());
    let resultNewPassword = vldPassword.test(txtNewPassword.val());
    let resultConfirmNewPassword = vldPassword.test(txtConfirmNewPassword.val());
    setInputState(  [txtOldPassword, txtNewPassword, txtConfirmNewPassword], 
                    [resultOldPassword, resultNewPassword, resultConfirmNewPassword]);
    switch (false) {
        case resultOldPassword:
            setAlert( txtOldPassword.val().length == 0 ? "舊密碼欄位為必要欄位，請輸入您目前在使用的密碼。" : "請在舊密碼欄位中輸入5~16字間，並符合的密碼格式: 數字、英文字母或 _?!@#+- 字元。" );
            break;
        case resultNewPassword:
            setAlert( txtNewPassword.val().length == 0 ? "新密碼欄位為必要欄位，請輸入您目前在使用的密碼。" : "請在新密碼欄位中輸入5~16字間，並符合的密碼格式: 數字、英文字母或 _?!@#+- 字元。" );
            break;
        case resultConfirmNewPassword:
            if ( txtConfirmNewPassword.val().length == 0 ) {
                setAlert("確認新密碼欄位為必要欄位，請輸入您目前在使用的密碼。");
            }
            else if ( txtNewPassword.val() != txtConfirmNewPassword.val()) {
                setAlert("請在確認新密碼欄位中輸入與新密碼欄位一樣的密碼。");
            }
            break;
        default:
            setAlert();
    }
    return;
    //Success, send data to server
    $.ajax({
        url     : "/userChangeANewPW",
        type    : "POST",
        data    : {
            oldPassword : txtOldPassword.val(),
            newPassword : txtNewPassword.val(),
            conNewPassword : txtConfirmNewPassword.val()
        },
        success : (respone) => {
            //Check success or not.
        }
    });
}

function setInputState(elements, results) {
    for (var i = 0; i < elements.length; i++) {
        if (results[i] && elements[i].hasClass("has-error")) {
            elements[i].removeClass("has-error");
        }
        else if (!results[i] && !elements[i].hasClass("has-error")) {
            elements[i].addClass("has-error");
        }
    }
}

function setAlert(message) {
    divAlert.children().remove();
    if (message) {
        divAlert.append("<div class='alert alert-danger mt-20'>" + message + "</div>");
    }
}