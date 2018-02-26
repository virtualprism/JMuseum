const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let ParticipationSchema = Schema({
    nthSeason : Number,
    themeName : String,
    activityRank : Number,
    postTime : { type: Date, default: Date.now }
});

ParticipationSchema.statics.createNewParticipation = function (data, callback) {
    let newParticipation = this({
        nthSeason : data.nthSeason,
        themeName : data.themeName,
        activityRank : data.activityRank,
        postTime : data.postTime
    });
    newParticipation.save((err, obj) => {
        if (err)
            callback(err, null);
        else
            callback(null, obj._id);
    });
};

module.exports = mongoose.model("Participation", ParticipationSchema);