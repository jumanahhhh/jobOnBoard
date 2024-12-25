const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware setup
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Maheen@82',
    database: 'project',
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to the MySQL database!');
});

// Utility functions
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send("You must be logged in!");
    }
    try {
        const data = jwt.verify(token, "secretkey");
        req.user = data;
        next();
    } catch (err) {
        return res.status(401).send("Invalid or expired token. Please log in again.");
    }
}

// Routes
app.get('/', (req, res) => {
    return res.json("From Backend side!");
});

// Protected route example
app.get('/recruiter', isLoggedIn, (req, res) => {
    res.send("Welcome!");
});

app.get('/read', (req, res) => {
    let data = jwt.verify(req.cookies.token, "secretkey");
    console.log(data);
});

// Sign up for recruiters
app.post('/signup', (req, res) => {
    const sql = "INSERT INTO recruiters (fName, mName, lName, position, company, phone_no, user_password, mailId) VALUES (?)";
    const values = [
        req.body.fname,
        req.body.mname,
        req.body.lname,
        req.body.position,
        req.body.company,
        req.body.phone_no,
        req.body.user_password,
        req.body.email
    ];

    console.log('Signup data:', values);

    db.query(sql, [values], (err, data) => {
        if (err) {
            console.error('Database error:', err);
            return res.json("Error inserting data into the database");
        }
        console.log('Data inserted:', data);

        try {
            let token = jwt.sign({ email: req.body.email }, "secretkey");
            console.log("Generated Token:", token);
            res.cookie("token", token, {
                httpOnly: false,
                secure: false,
                sameSite: 'lax'
            });
            return res.json({ status: "Success", message: "User registered successfully", data });
        } catch (error) {
            console.error("Error generating token:", error);
            return res.json("Error generating token");
        }
    });
});

// signup for students
app.post('/signup-cand', (req, res) => {
    const dob = req.body.dob || null;
    const sql = "INSERT INTO students (srn, fName, mName, lName, dob, mailId, phone_no, CGPA, Backlogs, user_password) VALUES (?)";
    const values = [
        req.body.srn,
        req.body.fname,
        req.body.mname,
        req.body.lname,
        dob,
        req.body.email,
        req.body.phone_no,
        req.body.cgpa,
        req.body.backlogs,
        req.body.user_password
    ];

    console.log('Signup data:', values);

    db.query(sql, [values], (err, data) => {
        if (err) {
            console.log(req.body);
            console.error('Database error:', err);
            return res.json("Error inserting data into the database");
        }
        console.log('Data inserted:', data);
        return res.json(data);
    });
});

// login page for both students and recruiters
app.post('/login', (req, res) => {
    const { email, user_password } = req.body;
    const sql = "CALL LOGIN(?, ?, @userResult); SELECT @userResult AS result;";

    db.query(sql, [email, user_password], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: "Error", message: "Error occurred while accessing the database." });
        }
        const result = results[1][0].result;
        if (result === 'invalid user') {
            return res.json({ status: "Failed", message: "Invalid user, please check your credentials." });
        } else if (result === 'wrong password') {
            return res.json({ status: "Failed", message: "Incorrect password, please try again." });
        } else if (result === 'recruiter') {
            const recruiterSql = `SELECT recruiter_id, fname, lname FROM recruiters WHERE mailId = ?`;
            db.query(recruiterSql, [email], (err, recruiterResults) => {
                if (err || recruiterResults.length === 0) {
                    console.error('Error fetching recruiter details:', err);
                    return res.status(500).json({ status: "Error", message: "Error occurred while fetching recruiter details." });
                }

                const { recruiter_id, fname, lname } = recruiterResults[0];
                const token = jwt.sign({ email, role: 'recruiter', id: recruiter_id }, "secretkey", { expiresIn: '1h' });

                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 3600000 // 1 hour in milliseconds
                });

                return res.json({
                    status: "Success",
                    role: "recruiter",
                    recruiter_id,
                    fname,
                    lname
                });
            });
        } else if (result === 'student') {
            // Fetch student details by validating credentials directly in the students table
            const studentSql = `SELECT srn, fname, lname FROM students WHERE mailId = ? AND user_password = ?`;
            db.query(studentSql, [email, user_password], (err, studentResults) => {
                if (err || studentResults.length === 0) {
                    console.error('Error fetching student details:', err);
                    return res.status(500).json({ status: "Error", message: "Invalid credentials, please check your email and password." });
                }
        
                const { srn, fname, lname } = studentResults[0];
                const token = jwt.sign({ email, role: 'student', srn }, "secretkey", { expiresIn: '1h' });
        
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 3600000 // 1 hour in milliseconds
                });
        
                return res.json({
                    status: "Success",
                    role: "student",
                    srn,
                    fname,
                    lname
                });
            });
            
        } else {
            return res.status(500).json("Unexpected result");
        }
    });
});


app.get("/api/recruiter/:recruiter_id", isLoggedIn, (req, res) => {
    const { recruiter_id } = req.params;
    const query = "SELECT * FROM recruiters WHERE recruiter_id = ?";
    
    if (!recruiter_id) {
        return res.status(400).json({ error: "Recruiter ID is required" });
    }

    db.query(query, [recruiter_id], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No recruiter found with this ID" });
        }

        res.json(results[0]); // Return the first result object
    });
});

// Campaign creation for recruiters
app.post('/api/campaigns/create', (req, res) => {
    const {
        recruiter_id,
        company,
        role_offered,
        location,
        min_stiphend,
        max_stiphend,
        cgpa_cutoff,
        last_date
    } = req.body;

    console.log("Received data for campaign creation:", req.body);

    const sql = `
        INSERT INTO campaign (
            recruiter_id, company, role_offered, location, min_stiphend, 
            max_stiphend, cgpa_cutoff, last_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        recruiter_id,
        company,
        role_offered,
        location,
        min_stiphend,
        max_stiphend,
        cgpa_cutoff,
        last_date
    ];

    console.log("Prepared SQL values:", values);

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error('Error inserting campaign:', err);
            return res.status(500).json({ message: "Failed to create campaign" });
        }
        console.log('Campaign created successfully:', data);
        return res.json({ message: "Campaign created successfully" });
    });
});

// fetching of individual recruiters homepage based on unique email and password
app.get("/api/recruiter/:id/dashboard", (req, res) => {
    const recruiter_id = req.params.id;
    const query = "SELECT fname, lname FROM recruiters WHERE recruiter_id = ?";
  
    db.query(query, [recruiter_id], (err, results) => {
      if (err) {
        console.error("Error fetching recruiter:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Recruiter not found" });
      }
      res.json(results[0]); // Return the first result (fname, lname)
    });
  });

// app.get("/api/recruiter/:id", (req, res) => {
//     const recruiter_id = req.params.id;
//     console.log("Fetching recruiter with ID:", recruiter_id); // Log the recruiter ID
//     const query = "SELECT fname, lname FROM recruiters WHERE recruiter_id = ?";
  
//     db.query(query, [recruiter_id], (err, results) => {
//       if (err) {
//         console.error("Error fetching recruiter:", err);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }
//       if (results.length === 0) {
//         console.log("Recruiter not found for ID:", recruiter_id); // Log if not found
//         return res.status(404).json({ error: "Recruiter not found" });
//       }
//       console.log("Recruiter found:", results[0]); // Log the found recruiter
//       res.json(results[0]); // Return the first result (fname, lname)
//     });
// });


// API route to create a new campaign for individual recruiters
app.post("/api/campaigns", (req, res) => {
    const {
      recruiter_id,
      company,
      role_offered,
      location,
      min_stiphend,
      max_stiphend,
      cgpa_cutoff,
      last_date
    } = req.body;
  
    const query = "INSERT INTO campaign (recruiter_id, company, role_offered, location, min_stiphend, max_stiphend, cgpa_cutoff, last_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    
    db.query(query, [recruiter_id, company, role_offered, location, min_stiphend, max_stiphend, cgpa_cutoff, last_date], (err, results) => {
      if (err) {
        console.error("Error creating campaign:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      res.status(201).json({ message: "Campaign created successfully", campaignId: results.insertId });
    });
  });

// api route to edit the existing campaign
app.put("/api/campaigns/:campaign_id", (req,res)=>{
    const {campaign_id} = req.params;
    const{
        company,
        role_offered,
        location,
        min_stiphend,
        max_stiphend,
        cgpa_cutoff,
        last_date
    }=req.body;
    const query= `update campaign set company=? ,role_offered=? ,location=? ,min_stiphend=? ,max_stiphend=? ,cgpa_cutoff=? ,last_date=? where campaign_id=? `;
    db.query(query, [company,role_offered,location,min_stiphend,max_stiphend,cgpa_cutoff,last_date, campaign_id], (err,result)=>{
        if(err){
            console.log("Error Updating",err)
            return res.status(500).json({error: "Internal Error"});
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Campaign not found" });
        }
        res.json({message:"Campaign Updated Succesfully!"});
    })
})

// Fetch all the campaigns by individual recruiter ID
app.get("/api/campaigns/:recruiter_id", (req, res) => {
    const recruiterId = req.params.recruiter_id; // Corrected line
    const query = "SELECT c.campaign_id, c.recruiter_id, company, role_offered, location, min_stiphend, max_stiphend, cgpa_cutoff, last_date, count(srn) as appCount FROM campaign c LEFT OUTER JOIN applications a ON c.campaign_id=a.campaign_id WHERE c.recruiter_id = ? group by c.campaign_id";

    db.query(query, [recruiterId], (err, results) => {
      if (err) {
        console.error("Error fetching campaigns:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
  
      res.json(results); // Return all campaigns for the recruiter
    });
  });

// unique students homepage!
app.get('/student/:srn', (req, res) => {
    const { srn } = req.params;

    // SQL query to fetch fname and lname for the specified srn
    const studentSql = `SELECT fname, lname FROM students WHERE srn = ?`;

    db.query(studentSql, [srn], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: "Error", message: "Error occurred while accessing the database." });
        }

        if (results.length === 0) {
            return res.status(404).json({ status: "Failed", message: "Student not found." });
        }

        const { fname, lname } = results[0];
        return res.json({
            status: "Success",
            fname,
            lname
        });
    });
});

// listing of all the active campaigns for every student
app.get("/student/:srn/campaigns",(req,res)=>{
    const sql =`select * from campaign where DATE(last_date) >= CURDATE() order by last_date`;
    db.query(sql,(err,results)=>{
        if(err){
            console.log("Database Error!",err);
            return res.status(500).json({status:"Error", message:"Error has occured"});
        }   
        res.json(results);
    })
})

// storing the details based on srn and campaign_id, in the applications table ones applied by students
app.post("/api/campaigns/applied/:srn", (req, res) => {
    const srn = req.params.srn;
    const { campaignId } = req.body;

    if (!campaignId) {
      console.error("Campaign ID is missing");
      return res.status(400).json({ error: "Campaign ID is required" });
    }
  
    const query = "INSERT INTO applications (srn, campaign_id) VALUES (?, ?)";
    db.query(query, [srn, campaignId], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') { // Check for duplicate entry error code
          console.error("Duplicate entry error:", err);
          return res.status(400).json({ error: "Duplicate entry" });
        }
        console.error("Error applying to campaign:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
  
      console.log("Insert successful:", results);
      res.json({ message: "Application submitted successfully", results });
    });
  });
  


// to fetch all the applied students for a particular campaign 
app.get('/api/campaigns/:campaign_id/applications', (req, res) => {
    const campaignId = req.params.campaign_id;
  
    const query = 'SELECT s.srn as srn, CONCAT(fname," ", mname, " ", lname) as name, dob, cgpa, backlogs, mailId  FROM applications a INNER JOIN students s ON a.srn=s.srn WHERE campaign_id = ?';
    
    db.query(query, [campaignId], (err, results) => {
      if (err) {
        console.error("Error fetching applications:", err);
        return res.status(500).json({ message: 'Failed to fetch applications' });
      }
  
    //   console.log("Applications fetched successfully:", results);    
      res.json(results);
    });
  });

//   app.get('/api/applied/students/:srn', (req, res) => {
//     const { srn } = req.params;
//     console.log(`Fetching details for SRN: ${srn}`); // Debugging SRN received
  
//     // Wrapping query in a Promise to use async/await
//     const fetchStudentData = () => {
//       return new Promise((resolve, reject) => {
//         db.query(
//           'SELECT s.srn as srn, sk.skill_type, sk.certificate_link , line1, line2 FROM students s INNER JOIN skills sk ON s.srn = sk.srn WHERE s.srn = ?',
//           [srn],
//           (error, results) => {
//             if (error) {
//               reject(error);
//             } else {
//               resolve(results);
//             }
//           }
//         );
//       });
//     };
  
//     fetchStudentData()
//       .then((student) => {
//         console.log('Raw database response:', student); // Debugging raw DB response
//         if (student.length) {
//           // Format data if results are found
//           const studentData = {
//             srn: student[0].srn,
//             skills: student.map((row) => ({
//               skill_type: row.skill_type,
//               certificate_link: row.certificate_link,
//               line1: row.line1,
//               line2: row.line2
//             })),
//           };
//           console.log('Formatted student data:', studentData); // Debugging formatted data sent to frontend
//           res.json(studentData);
//         } else {
//           console.log('No student found with given SRN'); // Debugging case when no student is found
//           res.status(404).json({ message: 'Student not found' });
//         }
//       })
//       .catch((error) => {
//         console.error('Database query error:', error);
//         res.status(500).json({ message: 'Internal server error' });
//       });
//   });
  
  

// logout functionality


app.get('/api/applied/students/:srn', async (req, res) => {
    const { srn } = req.params;
    console.log(`Fetching details for SRN: ${srn}`); // Debugging SRN received
  
    try {
      // Query to fetch skills
      const skillsQuery = new Promise((resolve, reject) => {
        db.query(
          'SELECT s.srn as srn, sk.skill_type, sk.certificate_link, line1,line2 FROM students s INNER JOIN skills sk ON s.srn = sk.srn WHERE s.srn = ?',
          [srn],
          (error, results) => {
            if (error) reject(error);
            else resolve(results);
          }
        );
      });
  
      // Query to fetch projects
      const projectsQuery = new Promise((resolve, reject) => {
        db.query(
          'SELECT s.srn as srn, link, line1, line2, line3 FROM students s INNER JOIN projects p ON s.srn = p.srn WHERE s.srn = ?',
          [srn],
          (error, results) => {
            if (error) reject(error);
            else resolve(results);
          }
        );
      });
  
      // Execute both queries
      const [skills, projects] = await Promise.all([skillsQuery, projectsQuery]);
  
      // Check if any data exists for the student
      if (skills.length || projects.length) {
        // Format data to send to frontend
        const studentData = {
          srn,
          skills: skills.map((row) => ({
            skill_type: row.skill_type,
            certificate_link: row.certificate_link,
            line1:row.line1,
            line2:row.line2,
        })),
          projects: projects.map((row) => ({
            link: row.link,
            line1: row.line1,
            line2: row.line2,
            line3: row.line3,
          })),
        };
        console.log('Formatted student data:', studentData); // Debugging formatted data
        res.json(studentData);
      } else {
        console.log('No data found for given SRN'); // Debugging case when no student data is found
        res.status(404).json({ message: 'Student data not found' });
      }
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

// API endpoint for submitting skills and projects
app.post('/api/skills-projects', (req, res) => {
  const {
    srn,
    skillLine1,
    skillLine2,
    skillType,
    certificateLink,
    projectTitle,
    projectLine1,
    projectLine2,
    projectLine3,
    projectLink,
  } = req.body;
  const skillQuery = `INSERT INTO skills (srn, line1, line2, skill_type, certificate_link) VALUES (?, ?, ?, ?, ?)`;
  const skillValues = [srn, skillLine1, skillLine2, skillType, certificateLink];

  db.query(skillQuery, skillValues, (skillErr, skillResult) => {
    if (skillErr) {
      console.error('Error inserting skills:', skillErr);
      return res.status(500).json({ error: 'Failed to add skills to database.' });
    }
    const projectQuery = `INSERT INTO projects (srn, title, line1, line2, line3, link) VALUES (?, ?, ?, ?, ?, ?)`;
    const projectValues = [srn, projectTitle, projectLine1, projectLine2, projectLine3, projectLink];

    db.query(projectQuery, projectValues, (projectErr, projectResult) => {
      if (projectErr) {
        console.error('Error inserting projects:', projectErr);
        return res.status(500).json({ error: 'Failed to add projects to database.' });
      }

      res.status(200).json({ message: 'Skills and projects added successfully.' });
    });
  });
});



app.get('/logout', (req, res) => {
    res.cookie('token', "", {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

// Start server
app.listen(8081, () => {
    console.log("Server is Listening!");
});

module.exports = db;


