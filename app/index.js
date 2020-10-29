const productRoute= require('./controllers/product');
const userRoute=require("./controllers/user");
const shoppingCartRoute=require("./controllers/shoppingcart");

module.exports=function(app,db){
    productRoute(app,db);    
    userRoute(app,db);   
    shoppingCartRoute(app,db);
}

