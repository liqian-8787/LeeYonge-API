const { Double, Long } = require('mongodb');
const mongoose = require('mongoose');
const { update } = require('./session');
const shoppingCart=mongoose.model('shoppingcarts');
const Schema = mongoose.Schema;

const orderHistorySchema = new Schema({

    uid:
    {
        type:String,
        required:true
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


const orderHistoryModel = mongoose.model('orderhistory', orderHistorySchema);

module.exports = orderHistoryModel;