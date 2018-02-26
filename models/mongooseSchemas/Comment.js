const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let CommentSchema = Schema({
    username : String,
    photo : String,
    comment : String,
    time : {type : Date, default : new Date()},
    fromActivity : {type : Boolean, default : false}
});

CommentSchema.statics.createNewComment = function (data, callback) {
    let newComment = this({
        username: data.username,
        photo: data.photo,
        comment: data.comment,
        time: new Date(),
        fromActivity: data.fromActivity
    });
    newComment.save((err, comment) => {
        if (err)
            callback(err, null);
        else
            callback(null, comment._id);
    });
}

module.exports = mongoose.model("Comment", CommentSchema);