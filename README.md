# not-today-vetting-application
Vetting application for the 2024 SLD 45 Data Derby
Application is designed to utilize handheld barcode scanners to scan a form of identification and compare that to a Jira Asset Database where a user's access level can be vetted against a meeting's access requirements.

# Frontend
`/frontend` contains a sample web frontend.
It is a single form with one text input element. When the user scans a barcode, it is typed into the field.

Once the backend is stood up, the ID can be sent to the backend and either validated or rejected. The entire UX is one button, and the UI turning green or red based.

# Backend
`/backend` contains the backend API server for communicating from the frontend/android app and checking against a Jira assets defined by the `JIRA_BASE_URL` variable in the `docker-compose.yml` file.

# DB-Middleware
`/db-middleware` contians the scripting necessarry for automatically converting an xls file to CSV, and pushing to a predefined BOX folder endpoint.

## Deployment
Before running, create `jira_secret.txt` in the root directory and populate with you Jira API token. This populates the Docker `JIRA_API_TOKEN` secret and will allow the backend to talk to your Jira instance.

`docker compose up` deploys the web server frontend and backend.

To run it on the scanner, either connect it to a network and open chrome and point it to the IP of the deployment, or connect it via USB-C and open the app through chrome remote debugging.
