//require("dotenv").config({path: "./env"}). can use this method as well , but code consistency bhi kuch hota hai



import dotenv from "dotenv";
dotenv.config({
    path:"./env"
})

//console.log("ENV CHECK:", process.env.MONGODB_URI);


import express from "express";
import connectDB from "./db/index.js";




connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log("server running at port:" , process.env.PORT);
    })
})
.catch((error) => {
    console.log("mongodb connection failed")
})






/*

(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)


    }catch(error){
        console.log("error: " ,error)
        
    }
})()


*/