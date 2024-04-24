// jiraClient.js
const axios = require('axios').default;

const jiraClient = (baseUrl, email, token) => {
    const instance = axios.create({
        baseURL: baseUrl,
        headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    });

    return {
        getIssue: async (issueIdOrKey) => {
        try {
            const response = await instance.get(`/rest/api/3/issue/${issueIdOrKey}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching issue:', error);
            throw error;
        }
        }

    };
    return {
        
    }
};

let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://jira.truststack.us/rest/assets/1.0/aql/objects?objectSchemaId=13&qlQuery=EDIPI LIKE "1601836"',
    headers: { 
      '': '', 
      'Authorization': 'Bearer OTM2MjEyMzU5MDczOo95vZ41mqbUG329vO1t7L+YH/ZF', 
      'Cookie': 'atlassian.xsrf.token=BKGV-POC5-6M1V-LV5M_ebfb0fd0228b8aa737a7f0a07eff8f9260acf924_lin; jira.collab.SESSIONID=FE3451840C3D08CFBEEAC3C019EED015'
    }
  };
  
  axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });
  


module.exports = jiraClient;
