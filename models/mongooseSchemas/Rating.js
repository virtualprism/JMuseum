const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let RatingSchema = Schema({
    username : String,
    score : {type : Number, min: 1, max: 5}
});

RatingSchema.statics.createNewRating = function(data, callback) {
    let newRating = this({
        username : data.username,
        score : data.score
    });
    newRating.save((err, rating) => {
        if (err)
            callback(err, null);
        else
            callback(null, rating);
    });
}

module.exports = mongoose.model("Rating", RatingSchema);