# Backend

Utilizes mostly express and axios to handle incoming requests from a front end (the android app), pull information from a Jira Asset DB, and then can perform basic user verification functionality.

`server.js` contains the main backend for defining endpoints and basic parameter processing.

`helperFunctions.js` contains helper functions that do most of the "Checking" functionality and performs all of the additional requests to Jira.