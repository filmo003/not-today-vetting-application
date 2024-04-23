// server.js
const express = require('express');
const app = express();
const port = 3000; // Choose any available port

app.get('/', (req, res) => {
  res.send('Hello from your Jira backend!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
