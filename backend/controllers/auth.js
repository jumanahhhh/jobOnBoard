// const db = require("../connect");
// const jwt = require("jsonwebtoken");

// const register=(req,res)=>{
//     const q="SELECT * FROM users WHERE username = ?"
//     db.query(q,[req.body.username],(err,data)=>{
//         if(err) return res.status(500).json(err)
//         if(data.length) return res.status(409).json("User already exists!");

//         // create a new user
//         const q ="INSERT INTO users('username','email','password','name') VALUE (?)"
//         const values = [req.body.username,req.body.email,req.body.password,req.body.name]

//         db.query(q,[values], (err,data)=>{
//             if(err) return res.status(500).json(err)
//             return res.status(200).json("User created!!");
//         })
//     })



// }
// const login =(req,res)=>{
//     const q= "SELECT * FROM users WHERE username =?"
//     db.query(1,[req.body.username],(err,data)=>{
//         if(err)return res.status(500).json(err)
//         if(data.length === 0) return res.status(404).json("User Not Found");

//         const checkPassword = (req.body.password,data[0].password)
//         if(!checkPassword) return res.status(400).json("Wrong password/username");  

//         const{password, ...other}=data[0]

//         const token = jwt.sign({id:data[0].id}, "secretkey");
//         res.cookie("accessToken",token,{
//             httpOnly:true
//         }).status(200).json(others)
//     })

// }
// const logout=(req,res)=>{
//     res.clearCookie({
//         secure:true,
//         sameSite:"none"
//     }).status(200).json("User has been logged out");
// }

// module.exports = {register,login,logout}



const db = require("../connect");
const jwt = require("jsonwebtoken");

const register = (req, res) => {
    const q = "SELECT * FROM recruiters WHERE mailId = ?";
    db.query(q, [req.body.mailId], (err, data) => {
        if (err) return res.status(500).json(err);
        if (data.length) return res.status(409).json("Recruiter already exists!");

        // Create a new recruiter
        const q = "INSERT INTO recruiters(`fname`, `mname`, `lname`, `position`, `company`, `phone_no`, `mailId`, `user_password`) VALUES (?)";
        const values = [
            req.body.fname,
            req.body.mname,
            req.body.lname,
            req.body.position,
            req.body.company,
            req.body.phone_no,
            req.body.mailId,
            req.body.user_password,
        ];

        db.query(q, [values], (err, data) => {
            if (err) return res.status(500).json(err);
            return res.status(200).json("Recruiter created successfully!");
        });
    });
}

const login = (req, res) => {
    const q = "SELECT * FROM recruiters WHERE mailId = ?";
    db.query(q, [req.body.mailId], (err, data) => {
        if (err) return res.status(500).json(err);
        if (data.length === 0) return res.status(404).json("Recruiter not found!");

        // Verify password
        const checkPassword = req.body.user_password === data[0].user_password;
        if (!checkPassword) return res.status(400).json("Incorrect mail ID or password.");

        const { user_password, ...other } = data[0];
        const token = jwt.sign({ id: data[0].recruiter_id }, "secretkey");

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure cookies in production
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Adjust based on environment
        }).status(200).json(other);
    });
}

const logout = (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure cookies in production
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    }).status(200).json("Recruiter has been logged out.");
}

module.exports = { register, login, logout };
