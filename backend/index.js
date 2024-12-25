const express = require('express');
const app =express();

const userRoutes = require("./routes/users.js");
const authRoutes = require("./routes/auth.js");
const postRoutes = require("./routes/posts.js");
const commentRoutes = require("./routes/comments.js");
const cors = require("cors");
const cookieParser = require('cookie-parser');

// Middlewares
app.use((Req,res,next)=>{
    res.header("Access-Control-Allow-Credentials",true)
    next()
})
app.use(express.json());
app.use(cors({
    origin:"https://localhost:3000"
}));
app.use(cookieParser())

app.use("/api/auth", authRoutes);  
app.use("/api/users",userRoutes); 
app.use("/api/posts",postRoutes); 
app.use("/api/comments", commentRoutes); 


app.listen(8800,()=>{
    console.log("Backend Working!");
})