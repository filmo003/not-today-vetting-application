@Grab('org.apache.poi:poi-ooxml:5.2.3')

import org.apache.http.entity.ContentType
import org.apache.http.entity.mime.MultipartEntityBuilder
import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.usermodel.XSSFWorkbook

import groovyx.net.http.HTTPBuilder
import static groovyx.net.http.Method.POST
import static groovyx.net.http.ContentType.JSON

import java.nio.file.Files
import java.nio.file.Paths

String box_subject_id    = "**********" // From the app config page in box.com
String box_client_id     = "**********" // From the app config page in box.com
String box_client_secret = "**********" // From the app config page in box.com

String box_folder_id     = "**********" // From the folder url
String box_file_id       = "**********" // from the file url
String box_source_file   = "https://<WORKSPACE>.box.com/shared/static/<FILESHARE>.xlsx" // from the box.com share file link

String localXlsxPath = "./artifacts/downloaded_file.xlsx"
String outputCsvPath = "./artifacts/output.csv"

/**
 * Downloads the file from supplied URL and saves it at a local path.
 *
 * @param fileUrl The URL of the file to be downloaded.
 * @param localPath The local destination where the file is to be saved.
 */
def downloadFile(String fileUrl, String localPath) {
    URL url = new URL(fileUrl)
    url.withInputStream { in ->
        Files.copy(in, Paths.get(localPath), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
    }
    println("File downloaded to ${localPath}")
}

/**
 * Converts a xlsx file to a csv file.
 *
 * @param xlsxPath The local path of the xlsx file.
 * @param csvPath The local path where the csv file should be saved.
 * @return A java.io.File object representing the new csv file.
 */
def xlsxToCsv(String xlsxPath, String csvPath) {
    Workbook workbook = new XSSFWorkbook(Files.newInputStream(Paths.get(xlsxPath)))
    DataFormatter formatter = new DataFormatter()
    PrintStream out = new PrintStream(new FileOutputStream(csvPath), true, "UTF-8")

    // Get the first sheet from the workbook
    Sheet sheet = workbook.getSheetAt(0)
    sheet.forEach { row ->
        row.cellIterator().with { it ->
            while (it.hasNext()) {
                Cell cell = it.next()
                out.print(formatter.formatCellValue(cell))
                if (it.hasNext()) {
                    out.print(',')
                }
            }
        }
        out.println()
    }
    out.close()
    workbook.close()
    return new File(csvPath)
}

/**
 * Uploads a specified file to Box using supplied access token and folderId
 *
 * @param accessToken The access token used for authentication.
 * @param folderId The ID of the Box folder where file should be uploaded.
 * @param file The java.io.File object to be uploaded.
 * @param fileId The file ID. If not supplied, default is "0".
 */
def uploadFileToBox(String accessToken, String folderId, File file, String fileId="0" ){
    def http = new HTTPBuilder("https://upload.box.com/api/2.0/files/${fileId}/content")

    http.request(POST, 'multipart/form-data') { req ->
        headers.'Authorization' = "Bearer $accessToken"

        MultipartEntityBuilder builder = MultipartEntityBuilder.create()
        builder.addBinaryBody("file", file, ContentType.DEFAULT_BINARY, file.name)

        req.entity = builder.build()

        response.success = { resp, json ->
            log.warn "File uploaded successfully: $json"
        }
        response.failure = { resp ->
            log.error "Failed to upload: ${resp.statusLine}"
        }
    }
}

/**
 * Retrieves box.com access token using supplied subjectId, clientId, and clientSecret
 *
 * @param subjectId The ID of the subject.
 * @param clientId The client ID.
 * @param clientSecret The client secret.
 * @return The access token as a String.
 */
def getClientCredentialsAccessToken(String subjectId, String clientId, String clientSecret) {
    def http = new HTTPBuilder('https://api.box.com/oauth2/token')
    def result = ""

    http.request(POST, JSON) { req ->
        body = [
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                box_subject_type: 'enterprise',
                box_subject_id: subjectId
        ]

        response.success = { resp, json ->
            result = json.access_token
            log.warn "Access Token: $result"
        }

        response.failure = { resp ->
            log.error "Failed to retrieve access token: ${resp.statusLine}"
            log.error "Error details: ${resp.entity.content.text}"
        }
    }
    return result
}

String auth_token = getClientCredentialsAccessToken(box_subject_id, box_client_id, box_client_secret)

downloadFile(box_source_file, localXlsxPath)

def converted_file = xlsxToCsv(localXlsxPath, outputCsvPath) as File

uploadFileToBox(auth_token, box_folder_id, converted_file, box_file_id)
