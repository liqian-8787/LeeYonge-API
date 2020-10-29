const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({

    name:
    {
        type:String,
        required:true

    },

    description:
    {
        type:String,
        required:true
    },

    image_url:{
        type:String
    },

    price:
    {
        type:Number,
        required:true
    },

    category:
    {
        type:String,
        required:true
    },

    isBestSeller:
    {
        type:Boolean,
        default:false
    },

    promotional_price:{
        type:Number,
        required:false
    },
    quantity:{
        type:Number,
        required:true,
        default:0
    },
    createdBy:{
        type:String,
        default:""
    },
    updatedBy:{
        type:String,
        default:""
    }
});


const productModel = mongoose.model('Products', productSchema);

module.exports = productModel;