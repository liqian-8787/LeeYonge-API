const express=require("express");

const bodyParser=require("body-parser");
const cookieParser = require('cookie-parser');

const MongoClient=require('mongodb').MongoClient;
const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
require('dotenv').config({path:"./config/keys.env"});

const app=express();

app.use(bodyParser.json());

app.use(cookieParser());

require('./app')(app,{});

const HTTP_PORT = process.env.PORT || 8080;

mongoose.connect(process.env.MONGO_DB_CONNECTION_ST, {useNewUrlParser: true, useUnifiedTopology: true})
.then(()=>{
    console.log(`Connected to MongoDB Database`);
})
.catch(err=>console.log(`Error occured when connecting to database ${err}`));

app.listen(HTTP_PORT,()=>{
    console.log(`${HTTP_PORT}`);
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

