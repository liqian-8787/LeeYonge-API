const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');

const SessionSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  status: {
    type: String,
    enum: ['valid', 'expired'],
    default: 'valid',
  },
});

SessionSchema.statics.generateToken = function() {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          reject(err);
        }
        const token = buf.toString('hex');
        resolve(token);
      });
    });
  };

  SessionSchema.methods.expireToken = function() {
    const session = this;
    return session.update({ $set: { status: 'expired' } });
  };
  
  SessionSchema.methods.deleteToken=function(token,cb){
    var session=this;

   return session.update({$unset : {token :1}},function(err,user){
        if(err) return cb(err);
        cb(null,user);
    })
}
  module.exports = mongoose.model('Session', SessionSchema);