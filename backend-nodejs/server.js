// server.js
const express = require('express');
const app = express();
const port = 3000; // Choose any available port
const axios = require('axios').default;
const objectSchemaId = 13 //Schema ID for the asset in Jira
const fs = require('fs');
const JIRA_API_TOKEN = fs.readFileSync('/run/secrets/JIRA_API_TOKEN', 'utf8').trim();
const JIRA_BASE_URL = process.env.JIRA_BASE_URL; //defined in docker-compose

//import jiraClient from './jiraClient';

app.get('/', (req, res) => {
    res.send('\nHello from the not-today backend!');
});

app.get('/checkAttendee', (req, res) => {
    const { edipi } = req.query;
    console.log(`User EDIPI: ${edipi}`);
    if (!edipi) {
        return res.status(400).json({ error: "need edipi"})
    }
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://jira.truststack.us/rest/assets/1.0/aql/objects?objectSchemaId=${objectSchemaId}&qlQuery=EDIPI LIKE "${edipi}"`,
        headers: { 
        '': '', 
        'Authorization': `'Bearer ${JIRA_API_TOKEN}'`, 
        }
    };
    
    axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    });

    res.send('\nPlaceholder for now')
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
