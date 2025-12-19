import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit: "16.kb"
})) // this is a middleware for express to accept json as input

app.use(express.urlencoded({extended: true}))

app.use(express.static("public"))
app.use(cookieParser());




// routes
import userRoute from "./routes/user.routes.js"


app.use("/api/v1/users", userRoute)
export { app }