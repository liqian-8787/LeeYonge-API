const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require("bcryptjs");

const validateEmail = (email)=> {
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
  return emailRegex.test(email);
};
const userSchema = new Schema({

    firstName:
    {
        type:String,
        required:true,
        match:/[a-z]/
    },

    lastName:
    {
        type:String,
        required:true,
        match:/[a-z]/      
    },

    email:
    {
        type:String,       
        minlength: 1,
        trim: true, //calls .trim() on the value to get rid of whitespace
        unique: true,//note that the unique option is not a validator; we use mongoose-unique-validator to enforce it
        required: 'Email address is required',
        validate: [validateEmail, 'Please fill a valid email address']
    },

    password:
    {
        type:String,
        required:true,
        minlength: 8
    }, 
  
});

userSchema.plugin(uniqueValidator);


//this function will be called before a document is saved
userSchema.pre('save', function(next) {
    let user = this;
  
    if (!user.isModified('password')) {
      return next();
    }
  
    //we generate the salt using 12 rounds and then use that salt with the received password string to generate our hash
    bcrypt
      .genSalt(12)
      .then((salt) => {
        return bcrypt.hash(user.password, salt);
      })
      .then((hash) => {
        user.password = hash;
        next();
      })
      .catch((err) => next(err));
  });

 
 const userModel = mongoose.model('User', userSchema);

 module.exports = userModel;








