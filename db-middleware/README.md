# Box File Management Script for Jira Data Center

This Groovy script facilitates file operations between a Jira Data Center instance and Box.com. It includes functionalities to download an Excel file from a Box.com share link, convert it to CSV format, and then upload or update it back to Box.com.

## Features

- **Download Excel File**: Downloads an `.xlsx` file from a specified Box.com URL.
- **Convert Excel to CSV**: Converts the downloaded `.xlsx` file into a CSV format.
- **Upload File to Box**: Uploads the converted CSV file back to Box.com, either as a new file or updates an existing one.

## Prerequisites

- Jira Data Center with Scriptrunner installed.
- Apache POI library for handling Excel files.
- Groovy's HTTPBuilder for making HTTP requests.

## Configuration

Before running the script, you must configure it with the appropriate credentials and file paths:

1. **Box API Credentials**: Obtain `client_id`, `client_secret`, and `subject_id` from your Box application settings.
2. **File Paths and IDs**:
    - `box_folder_id`: ID of the target folder on Box where the files will be uploaded.
    - `box_file_id`: ID of the file on Box to be updated (if applicable).
    - `box_source_file`: URL of the source Excel file on Box.
    - `localXlsxPath`: Local path on the Jira server where the Excel file will be downloaded.
    - `outputCsvPath`: Local path on the Jira server where the converted CSV file will be saved.

## Usage

To use the script, ensure all configurations are correctly set in the script variables. The script can be executed as a scheduled job or a custom script in Scriptrunner.

### Functions

- `downloadFile(String fileUrl, String localPath)`: Downloads a file from the specified URL to the provided local path.
- `xlsxToCsv(String xlsxPath, String csvPath)`: Converts an Excel file at `xlsxPath` to a CSV file at `csvPath`.
- `uploadFileToBox(String accessToken, String folderId, File file, String fileId)`: Uploads a file to Box using the given credentials. If `fileId` is specified, the existing file will be updated.
- `getClientCredentialsAccessToken(String subjectId, String clientId, String clientSecret)`: Retrieves an access token using client credentials.

# Box File Management Script for Jira Data Center

This Groovy script facilitates file operations between a Jira Data Center instance and Box.com. It includes functionalities to download an Excel file from a Box.com share link, convert it to CSV format, and then upload or update it back to Box.com.

## Features

- **Download Excel File**: Downloads an `.xlsx` file from a specified Box.com URL.
- **Convert Excel to CSV**: Converts the downloaded `.xlsx` file into a CSV format.
- **Upload File to Box**: Uploads the converted CSV file back to Box.com, either as a new file or updates an existing one.

## Prerequisites

- Jira Data Center with Scriptrunner installed.
- Apache POI library for handling Excel files.
- Groovy's HTTPBuilder for making HTTP requests.

## Configuration

Before running the script, you must configure it with the appropriate credentials and file paths:

1. **Box API Credentials**: Obtain `client_id`, `client_secret`, and `subject_id` from your Box application settings.
2. **File Paths and IDs**:
    - `box_folder_id`: ID of the target folder on Box where the files will be uploaded.
    - `box_file_id`: ID of the file on Box to be updated (if applicable).
    - `box_source_file`: URL of the source Excel file on Box.
    - `localXlsxPath`: Local path on the Jira server where the Excel file will be downloaded.
    - `outputCsvPath`: Local path on the Jira server where the converted CSV file will be saved.

## Usage

To use the script, ensure all configurations are correctly set in the script variables. The script can be executed as a scheduled job or a custom script in Scriptrunner.

### Functions

- `downloadFile(String fileUrl, String localPath)`: Downloads a file from the specified URL to the provided local path.
- `xlsxToCsv(String xlsxPath, String csvPath)`: Converts an Excel file at `xlsxPath` to a CSV file at `csvPath`.
- `uploadFileToBox(String accessToken, String folderId, File file, String fileId)`: Uploads a file to Box using the given credentials. If `fileId` is specified, the existing file will be updated.
- `getClientCredentialsAccessToken(String subjectId, String clientId, String clientSecret)`: Retrieves an access token using client credentials.

## Security Note
Ensure that your API credentials and sensitive details are stored securely and not hardcoded into the script in a production environment.

## Logging
The script includes basic logging for each operation. Ensure the Scriptrunner logging is configured to capture these logs for troubleshooting.

For any further customization or issues, refer to the Scriptrunner documentation and the Box API documentation.
