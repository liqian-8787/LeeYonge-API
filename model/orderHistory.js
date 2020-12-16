const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderHistorySchema = new Schema({

    uid:
    {
        type:String,
        required:true
    },
    customerInfo:{       
            firstName:{type:String},
            lastName: {type:String},
            email: {type:String}       
    },
  
    orders:[{
        cart_total: {type:Number},
        products: [{
            id: {type:String},
            name:{type:String},
            image_url:{type:String},
            price:{type:Number},
            promotional_price:{type:Number},
            description:{type:String},
            quantity:{type:Number}
        }],
        date:{ type:String }
    }]
});


const orderHistoryModel = mongoose.model('orderhistories', orderHistorySchema);

module.exports = orderHistoryModel;