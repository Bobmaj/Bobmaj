// server.js
require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const session = require('express-session');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, httpOnly: true, sameSite: 'strict' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'questionnaire.html'));
});

// Handle form submission
app.post('/submit', [
  body('name').trim().escape(),
  body('age').isInt({ min: 0, max: 120 }).toInt(),
  body('gender').isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('maritalStatus').isIn(['single', 'married', 'divorced', 'widowed']),
  body('opinion').trim().escape(),
  body('religious_view').trim().escape(),
  body('cultural_factors').trim().escape(),
  body('challenges').trim().escape(),
  body('benefits').trim().escape(),
  body('guidance').trim().escape(),
  body('societal_changes').trim().escape(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const data = req.body;
  
  // Generate a unique identifier for this submission
  const id = crypto.randomBytes(16).toString('hex');
  
  // Separate the name from other data
  const name = data.name;
  delete data.name;
  
  // Save anonymized data
  fs.writeFile(path.join(__dirname, 'submissions', `${id}.json`), JSON.stringify(data), (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saving submission');
    }
    console.log('Anonymized data saved');
  });
  
  // Save name with corresponding ID (only accessible to you)
  fs.appendFile(path.join(__dirname, 'names.txt'), `${id}: ${name}\n`, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saving name');
    }
    console.log('Name saved');
  });
  
  res.send('Thank you for your submission!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start the server
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync('/path/to/private-key.pem'),
    cert: fs.readFileSync('/path/to/certificate.pem')
  };
  https.createServer(options, app).listen(port, () => {
    console.log(`Secure server running on port ${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// questionnaire.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Islamic Social Experiment: Relationship Questionnaire</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 800px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        form {
            margin-top: 20px;
        }
        label {
            display: block;
            margin-top: 10px;
        }
        input[type="text"], input[type="number"], select, textarea {
            width: 100%;
            padding: 8px;
            margin-top: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        input[type="submit"] {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 20px;
        }
        input[type="submit"]:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Islamic Social Experiment: Relationship Questionnaire</h1>
        <form id="relationshipSurvey" action="/submit" method="post">
            <label for="name">Full Name (visible only to the researcher):</label>
            <input type="text" id="name" name="name" required>

            <label for="age">Age:</label>
            <input type="number" id="age" name="age" required>

            <label for="gender">Gender:</label>
            <select id="gender" name="gender" required>
                <option value="">Select an option</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
            </select>

            <label for="maritalStatus">Marital Status:</label>
            <select id="maritalStatus" name="maritalStatus" required>
                <option value="">Select an option</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
            </select>

            <label for="opinion">What is your general opinion on romantic relationships before marriage?</label>
            <textarea id="opinion" name="opinion" rows="4" required></textarea>

            <label for="religious_view">How do you believe your religious beliefs influence your views on romantic relationships?</label>
            <textarea id="religious_view" name="religious_view" rows="4" required></textarea>

            <label for="cultural_factors">Are there any cultural factors that shape your perspective on romantic relationships? If so, please explain:</label>
            <textarea id="cultural_factors" name="cultural_factors" rows="4" required></textarea>

            <label for="challenges">What do you perceive as the main challenges or concerns in romantic relationships within your community?</label>
            <textarea id="challenges" name="challenges" rows="4" required></textarea>

            <label for="benefits">In your opinion, what are the potential benefits of romantic relationships before marriage?</label>
            <textarea id="benefits" name="benefits" rows="4" required></textarea>

            <label for="guidance">What guidance or advice would you give to young people in your community regarding romantic relationships?</label>
            <textarea id="guidance" name="guidance" rows="4" required></textarea>

            <label for="societal_changes">Have you noticed any changes in societal attitudes towards romantic relationships in recent years? If yes, please describe:</label>
            <textarea id="societal_changes" name="societal_changes" rows="4" required></textarea>

            <input type="submit" value="Submit">
        </form>
    </div>
</body>
</html>

// .env
PORT=3000
SESSION_SECRET=your_very_long_and_secure_random_string
NODE_ENV=development
```
