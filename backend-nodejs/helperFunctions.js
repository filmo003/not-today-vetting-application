const fs = require('fs');
const axios = require('axios').default;

const JIRA_API_TOKEN = fs.readFileSync('/run/secrets/JIRA_API_TOKEN', 'utf8').trim();
const objectSchemaId = 13; //Schema ID for the asset in Jira
const JIRA_BASE_URL = process.env.JIRA_BASE_URL; //defined in docker-compose

module.exports = {
  checkClearance: function (reqClearance, edipi, res){

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jira.truststack.us/rest/assets/1.0/aql/objects?objectSchemaId=${objectSchemaId}&qlQuery=EDIPI LIKE "${edipi}"`,
      headers: {  
          "Authorization" : `Bearer ${JIRA_API_TOKEN}`
      }
    };

    axios.request(config)
    .then((response) => {
      const responseString = JSON.stringify(response.data);
      personObject = response.data.objectEntries[0];
      if (!personObject){
          console.log("No entry found")
          res.send("No entry found. Deny");
          return
      }
      // check person's access is at least secret
      personName = personObject.label;
      console.log(`Name = ${personName}`);
      // iterate through attributes to find "access" attribute
      for (const attribute of personObject.attributes) {
          if (attribute.id == 414540) { //id of access attribute
              if (attribute.objectAttributeValues[0].value.includes(reqClearance)) {
                  console.log("Correct clearance!");
                  res.send('\nCorrect Clearance! Admit');
                  return
              }
              res.send('\nIncorrect Clearance, Deny');
              return
          }
      }
      res.send('something went wrong');
    })
    .catch((error) => {
      console.log(error);
    });
  }
}