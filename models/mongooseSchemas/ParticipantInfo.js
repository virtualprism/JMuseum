const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let ParticipantInfoSchema = Schema({
    links: String,
    rank: Number,
    artist: String,
    paintingName: { type: String, minlength: 1 },
    description: { type: String, default: ""},
    totalScore: { type: Number, default: 0},
    ratings: [{type: Schema.Types.ObjectId, ref: "Rating"}],
    comment: [{type: Schema.Types.ObjectId, ref: "Comment"}],
    postTime : { type: Date, default: Date.now }
});

ParticipantInfoSchema.statics.createNewParticipantInfo = function (data, callback) {
    let newPartInfo = this({
        links : data.links,
        rank : data.rank,
        artist : data.artist,
        paintingName : data.paintingName,
        description : data.description,
        totalScore : data.totalScore,
        ratings : data.ratings,
        postTime : data.postTime
    });
    newPartInfo.save((err, partInfo) => {
        if (err)
            callback(err, null);
        else
            callback(null, partInfo._id);
    });
};

module.exports = mongoose.model("ParticipantInfo", ParticipantInfoSchema);