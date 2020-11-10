const { Double, Long } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shoppingCartSchema = new Schema({

    uid:
    {
        type:String,
        required:true
    },
    products:    
    [
        {
            pid: {type:String},
            productName:{type:String},
            image_url:{type:String},
            unit_price:{type:Number},
            promotion_price:{type:Number},
            quantity:{type:Number},
            unit_total:{type:Number}
        }
    ],
    cart_total:{
        type:Number,
        default:0
    }
});


const shoppingCartModel = mongoose.model('shoppingcarts', shoppingCartSchema,);

module.exports = shoppingCartModel;