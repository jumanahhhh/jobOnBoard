const express = require('express');
const getUser = require("../controllers/campaign"); // Updated controller path

const router = express.Router();

// Define the routes for campaigns (keeping the structure similar to posts)
router.get("/", getUser);

module.exports = router;
