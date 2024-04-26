package us.truststack.nottoday

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.util.Log
import android.view.KeyEvent
import android.view.MenuItem
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.Camera
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraInfo
import androidx.camera.core.CameraSelector
import androidx.camera.core.DisplayOrientedMeteringPointFactory
import androidx.camera.core.FocusMeteringAction
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.camera.CameraSourceConfig
import com.google.mlkit.vision.camera.CameraXSource
import com.google.mlkit.vision.camera.DetectionTaskCallback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.lang.Integer.parseInt
import java.util.concurrent.TimeUnit

fun JSONObject.toMap(): Map<String, *> = keys().asSequence().associateWith {
    when (val value = this[it]) {
        is JSONArray -> {
            val map = (0 until value.length()).associate { Pair(it.toString(), value[it]) }
            JSONObject(map).toMap().values.toList()
        }

        is JSONObject -> value.toMap()
        JSONObject.NULL -> null
        else -> value
    }
}

class UserStore(private val context: Context) {
    companion object {
        private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("userToken")
        private val API_URL = stringPreferencesKey("api_url")
        private val MEETING_ID = stringPreferencesKey("meeting_id")

    }

    val getUrl: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[API_URL] ?: ""
    }

    suspend fun saveUrl(token: String) {
        context.dataStore.edit { preferences ->
            preferences[API_URL] = token
        }
    }

    val getID: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[MEETING_ID] ?: ""
    }

    suspend fun saveID(token: String) {
        context.dataStore.edit { preferences ->
            preferences[MEETING_ID] = token
        }
    }
}

data class AttendeeInfo(
    val version: String,
    val dodID: Int,
    val firstName: String,
    val middleInitial: String,
    val lastName: String,
    val csid: Int,
    val personType: String,
    val personCategory: String,
    val branch: String,
    val cardID: String,
)

val PCC = hashMapOf(
    "A" to "Active Duty",
    "B" to "Presidential Appointee (Civilian)",
    "C" to "Civilian",
    "D" to "Disabled Veteran",
    "E" to "Contractor",
    "F" to "Former Member (Reserve Service)",
    "I" to "Non-DoD Civil Service",
    "J" to "Academy Student",
    "K" to "Non Appropriated Fund (NAF) employee",
    "L" to "Lighthouse Service",
    "M" to "Non Federal Agency Civilian Associates",
    "O" to "Non-DoD Contractor",
    "Q" to "Reserve Retiree (Gray Area Retiree)",
    "T" to "Foreign Military",
    "U" to "DoD OCONUS Hire",
    "W" to "DoD Beneficiary (Family Membor of service member)",
    "Y" to "Service Associate",
)

fun AIToString(at: AttendeeInfo): String {
    var ret = ""
    if (at.firstName != "" || at.middleInitial != "" || at.lastName != "") {
        ret += "Name: " + at.lastName + ", " + at.firstName + " " + at.middleInitial + "\n"
    }
    ret += "DoD ID: " + at.dodID + "\n"
    ret += "CSID (DBIDS/DMDC): " + at.csid + "\n"
    if (at.personCategory != "") {
        ret += PCC.getOrDefault(at.personCategory, at.personCategory) + "\n"
    }
    return ret.trim()
}

class MainActivity : AppCompatActivity() {
    private var meeting_list: Array<String> = Array(0, { "" })
    private var api_url: String = ""
    private var meeting_id: String = ""
    private lateinit var store: UserStore
    private lateinit var barcodeInfo: TextView
    private lateinit var cameraView: PreviewView
    private lateinit var cameraController: LifecycleCameraController
    private lateinit var processCameraProvider: ProcessCameraProvider
    private lateinit var camera: Camera
    private lateinit var cameraControl: CameraControl
    private lateinit var cameraInfo: CameraInfo
    private var cameraSource: CameraXSource? = null
    private lateinit var successPlayer: MediaPlayer
    private lateinit var failPlayer: MediaPlayer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
        successPlayer = MediaPlayer.create(baseContext, R.raw.success)
        failPlayer = MediaPlayer.create(baseContext, R.raw.success)
        disable_scan2key()
        val intentFilter = IntentFilter()
        intentFilter.addAction("unitech.scanservice.data")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(mUssReceiver, intentFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(mUssReceiver, intentFilter)
        }
        this.store = UserStore(this)

        val temp = this
        CoroutineScope(Dispatchers.IO).launch {
            temp.store.getUrl.collect {
                temp.api_url = it
                if (temp.api_url != "") {
                    get_meetings(temp.api_url)
                }
            }

            temp.store.getID.collect {
                temp.meeting_id = it
            }
        }
        val spinner = findViewById<Spinner>(R.id.spinner)
        spinner.setSelection(meeting_list.indexOf(meeting_id))
        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(
                parent: AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long
            ) {
                meeting_id = parent!!.getItemAtPosition(position) as String
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                return
            }
        }
        this.cameraView = findViewById<View>(R.id.camera_view) as PreviewView
        this.barcodeInfo = findViewById<View>(R.id.idInfo) as TextView
        this.cameraView.visibility = View.GONE
        if (allPermissionsGranted()) {
            get_camera()
        }
        val te = findViewById<EditText>(R.id.etBarCode)
        te.setOnKeyListener { v, keyCode, event ->
            Log.println(Log.ERROR, "KEYCODE", keyCode.toString())
            if (keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_UP) {
                barcodeInfo.text = ""
                val barcode = te.text.toString()
                if (barcode == null) {
                    return@setOnKeyListener true
                }
                te.setText(barcode)
                val at = parseBarcode(barcode)
                if (at == null) {
                    Log.println(Log.WARN, "scanner", "Unable to parse barcode: $barcode")
                    return@setOnKeyListener true
                }
                this.barcodeInfo.text = AIToString(at).replace("\\n", "<br/>")
                lookup(at, meeting_id)
                return@setOnKeyListener true
            }
            return@setOnKeyListener false
        }
    }

    private fun request_permissions() {
        ActivityCompat.requestPermissions(
            this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS
        )
    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }

    companion object {
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = mutableListOf(Manifest.permission.CAMERA).toTypedArray()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<String>, grantResults:
        IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                get_camera()
            } else {
                Toast.makeText(
                    this,
                    "Permissions not granted by the user.",
                    Toast.LENGTH_SHORT
                ).show()
                finish()
            }
        }
    }


    private fun save_url(url: String) {
        CoroutineScope(Dispatchers.IO).launch {
            store.saveUrl(url)
        }
    }


    private val mUssReceiver: BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == "unitech.scanservice.data") {
                val te = findViewById<EditText>(R.id.etBarCode)
                val barcode = intent.getStringExtra("text")
                if (barcode == null) {
                    return
                }
                te.setText(barcode)
                val at = parseBarcode(barcode)
                if (at == null) {
                    Log.println(Log.WARN, "scanner", "Unable to parse barcode: $barcode")
                    return
                }
                findViewById<TextView>(R.id.idInfo).text = AIToString(at).replace("\\n", "<br/>")
                lookup(at, meeting_id)
            }
        }
    }

    fun result_callback(response: String, res: Int) {
        runOnUiThread {
            this.successPlayer.stop()
            this.failPlayer.stop()
            this.successPlayer = MediaPlayer.create(baseContext, R.raw.success)
            this.failPlayer = MediaPlayer.create(baseContext, R.raw.success)
            var result: Map<String, *>? = null
            try {
                result = JSONObject(response).toMap()
                Log.println(Log.ERROR, "RESULT", result.toString())
            } catch (e: Exception) {
                Toast.makeText(
                    this,
                    "Unknown error",
                    Toast.LENGTH_SHORT
                ).show()
                findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.yellow))
                Log.println(Log.ERROR, "RESULT-ST", e.stackTrace.toString())
                return@runOnUiThread
            }
            if (res == 200) {
                Log.println(Log.ERROR, "RESULT-SUCCESS", "${barcodeInfo.text}")
                barcodeInfo.text =
                    "${barcodeInfo.text}\nresponse: ${result.getOrDefault("message", "fail")}"
                findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.green))
                this.successPlayer.start()
                return@runOnUiThread
            } else {
                if (res == 403) {
                    if (result.contains("error") && result["error"] == "No entry found. Deny") {
                        findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.yellow))
                    } else {
                        findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.red))
                        return@runOnUiThread
                    }
                }
                if (result.contains("error")) {
                    Toast.makeText(
                        this,
                        "Error: ${result["error"]}",
                        Toast.LENGTH_SHORT
                    ).show()
                    findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.yellow))
                    barcodeInfo.text =
                        "${barcodeInfo.text}\nerror: ${result.getOrDefault("error", "fail")}"
                    return@runOnUiThread
                }
            }
        }
    }

    fun meeting_list_callback(response: String, res: Int) {
        val temp = this
        val list = ArrayList<String>()
        try {
            val result = JSONObject(response).getJSONArray("objectEntries")
            for (i in 0..<result.length()) {

                var tmp = result.getJSONObject(i).getJSONArray("attributes")
                for (x in 0..<tmp.length()) {
                    val obj = tmp.getJSONObject(x)
                    if (obj.getString("objectTypeAttributeId") == "1951") {
                        list.add(
                            obj.getJSONArray("objectAttributeValues").getJSONObject(0)
                                .getString("value")
                        )
                    }
                }
            }
        } catch (e: Exception) {
            runOnUiThread {
                Toast.makeText(
                    temp,
                    "Failed to retrieve meeting list",
                    Toast.LENGTH_SHORT
                ).show()
                Log.println(Log.ERROR, "MEETING", "$e ${e.stackTrace}")
                findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.yellow))
            }
            return
        }

        if (res == 200) {
            runOnUiThread {
                val spinner = findViewById<Spinner>(R.id.spinner)
                this.meeting_list = list.toTypedArray()
                spinner.adapter = ArrayAdapter(temp, R.layout.list_item, this.meeting_list)
                spinner.setSelection(this.meeting_list.indexOf(this.meeting_id))
            }
        }
    }

    fun parseBarcode(barcode: String): AttendeeInfo? {
        val trimBarcode = barcode.trim()
        Log.println(Log.DEBUG, "parseBarcode", trimBarcode + " " + trimBarcode.length)
        if (trimBarcode.length == 18) {
            return AttendeeInfo(
                version = trimBarcode[0].toString(),
                dodID = Integer.valueOf(trimBarcode.slice(IntRange(8, 14)), 32),
                firstName = "",
                middleInitial = "",
                lastName = "",
                csid = Integer.valueOf(trimBarcode.slice(IntRange(1, 6)), 32),
                personType = trimBarcode[7].toString(),
                personCategory = trimBarcode[15].toString(),
                branch = trimBarcode[16].toString(),
                cardID = trimBarcode[17].toString(),
            )
        }
        if (trimBarcode.length == 99) {

            return AttendeeInfo(
                version = trimBarcode[0].toString(),
                dodID = parseInt(trimBarcode.slice(IntRange(1, 7)), 32),
                firstName = trimBarcode.slice(IntRange(16, 35)).trim(),
                middleInitial = trimBarcode[36].toString(),
                lastName = trimBarcode.slice(IntRange(37, 62)).trim(),
                csid = parseInt(trimBarcode.slice(IntRange(93, 98)), 32),
                personType = "",
                personCategory = "",
                branch = "",
                cardID = "",
            )
        }
        return null
    }

    private var client = OkHttpClient()

    @Throws(IOException::class)
    fun checkAttendee(url: String, edipi: String, meetingID: String) {
        var scheme = ""
        if (!url.startsWith("http")) {
            scheme = "http://"
        }
        val urlO = Uri.parse(scheme + url)
        val u = urlO.buildUpon().appendPath("checkAttendee")
            .appendQueryParameter("edipi", edipi)
            .appendQueryParameter("meetingID", meetingID).build().toString()
        val request: Request = Request.Builder()
            .post("".toRequestBody("application/json".toMediaType()))
            .url(u)
            .build()
        val temp = this
        client.newCall(request)
            .enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    e.printStackTrace()
                    runOnUiThread {
                        Toast.makeText(
                            temp,
                            "Failed to Check meeting attendee",
                            Toast.LENGTH_SHORT
                        ).show()
                        findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.yellow))
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        result_callback(response.body!!.string(), response.code)
                    }
                }
            })
    }

    @Throws(IOException::class)
    fun get_meetings(url: String) {
        var scheme = ""
        if (!url.startsWith("http")) {
            scheme = "http://"
        }
        val urlO = Uri.parse(scheme + url)
        Log.println(Log.ERROR, "SCHEME", urlO.scheme!!)
        val u = urlO.buildUpon().appendPath("meetings")
            .build().toString()
        val request: Request = Request.Builder()
            .url(u)
            .build()
        val temp = this
        client.newCall(request)
            .enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    e.printStackTrace()
                    runOnUiThread {
                        Toast.makeText(
                            temp,
                            "Unable to retrieve meeting list",
                            Toast.LENGTH_SHORT
                        ).show()
                        findViewById<View>(R.id.main).setBackgroundColor(resources.getColor(R.color.yellow))
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        runOnUiThread {
                            Toast.makeText(
                                temp,
                                "Retrieved meeting list",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                        meeting_list_callback(response.body!!.string(), response.code)
                    }
                }
            })
    }

    fun lookup(item: AttendeeInfo?, meeting_id: String) {
        Log.println(Log.DEBUG, "lookup", item.toString())
        if (item == null) {
            return
        }
        val e = buildJsonObject {
            put("dodid", JsonPrimitive(item.dodID))
        }

        checkAttendee(this.api_url, item.dodID.toString(), meeting_id)
    }

    private fun disable_scan2key() {
        val bundle = Bundle()
        bundle.putBoolean("scan2key", false)
        val mIntent = Intent().setAction("unitech.scanservice.scan2key_setting")
            .putExtras(bundle)
        sendBroadcast(mIntent)
    }

    private fun enable_scan2key() {
        val bundle = Bundle()
        bundle.putBoolean("scan2key", true)
        val mIntent = Intent().setAction("unitech.scanservice.scan2key_setting")
            .putExtras(bundle)
        sendBroadcast(mIntent)
    }

    fun set_website(item: MenuItem) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Website Address")
        val input = EditText(this)
        input.setInputType(InputType.TYPE_CLASS_TEXT)
        input.setText(this.api_url)
        builder.setView(input)

        builder.setPositiveButton(
            "OK"
        ) { _, _ ->
            disable_scan2key()
            this.api_url = input.getText().toString()
            save_url(this.api_url)
            if (this.api_url != "") {
                get_meetings(this.api_url)
            }
        }
        builder.setNegativeButton(
            "Cancel"
        ) { dialog, _ ->
            dialog.cancel()
            disable_scan2key()
            save_url(this.api_url)
        }
        enable_scan2key()
        builder.show()
        input.requestFocus()
        input.selectAll()
    }

    fun set_meeting_id(item: MenuItem) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Meeting ID")
        val input = EditText(this)
        input.setInputType(InputType.TYPE_CLASS_TEXT)
        input.setText(this.meeting_id)
        builder.setView(input)

        builder.setPositiveButton(
            "OK"
        ) { _, _ ->
            disable_scan2key()
            val id = input.getText().toString()
            this.meeting_id = id
            val spinner = findViewById<Spinner>(R.id.spinner)
            spinner.setSelection(this.meeting_list.indexOf(this.meeting_id))
            CoroutineScope(Dispatchers.IO).launch {
                store.saveID(id)
            }
        }
        builder.setNegativeButton(
            "Cancel"
        ) { dialog, _ ->
            dialog.cancel()
            disable_scan2key()
            CoroutineScope(Dispatchers.IO).launch {
                store.saveID(meeting_id)
            }
        }
        enable_scan2key()
        builder.show()
        input.requestFocus()
        input.selectAll()
    }

    @SuppressLint("MissingPermission")
    fun start_scanning(item: MenuItem) {
        if (allPermissionsGranted()) {
            this.cameraView.visibility = View.VISIBLE
            get_camera()
            cameraSource!!.start()
        } else {
            request_permissions()
            start_scanning(item)
        }
    }

    fun stop_scanning(item: MenuItem) {
        this.cameraView.visibility = View.GONE

        this.cameraSource?.stop()
    }

    fun refresh_meetings(item: MenuItem) {
        get_meetings(this.api_url)
    }

    private fun get_camera() {
        if (this.cameraSource != null) {
            return
        }
        val future = ProcessCameraProvider.getInstance(baseContext)
        future.addListener({
            this.processCameraProvider = future.get()
            this.camera =
                processCameraProvider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA)
            // For performing operations that affect all outputs.
            this.cameraControl = camera.cameraControl
            // For querying information and states.
            this.cameraInfo = camera.cameraInfo
        }, ContextCompat.getMainExecutor(this))
        this.cameraController = LifecycleCameraController(baseContext)
        cameraController.bindToLifecycle(this)


        val barcodeOptions = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(2)
            .build()

        val barcodeScanner = BarcodeScanning.getClient(barcodeOptions)
        val cameraSourceConfig =
            CameraSourceConfig.Builder(this, barcodeScanner, detector(barcodeInfo))
                .setFacing(CameraSourceConfig.CAMERA_FACING_BACK)
                .setRequestedPreviewSize(1200, 900)
                .build()
        this.cameraSource = CameraXSource(cameraSourceConfig, cameraView)
    }

    private fun focus() {

        cameraController.cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
        cameraView.controller = cameraController
        cameraController.enableTorch(true)
        val meteringPointFactory = DisplayOrientedMeteringPointFactory(
            cameraView.display,
            camera.cameraInfo,
            cameraView.width.toFloat(),
            cameraView.height.toFloat()
        )
        val temp = this
        cameraView.setOnTouchListener { _, event ->
            val meteringPoint = cameraView.meteringPointFactory
                .createPoint(event.x, event.y)
            val action = FocusMeteringAction.Builder(meteringPoint) // default AF|AE|AWB
                // The action is canceled in 3 seconds (if not set, default is 5s).
                .setAutoCancelDuration(3, TimeUnit.SECONDS)
                .build()

            val result = cameraControl.startFocusAndMetering(action)
            // Adds listener to the ListenableFuture if you need to know the focusMetering result.
            result.addListener({
                // result.get().isFocusSuccessful returns if the auto focus is successful or not.
            }, ContextCompat.getMainExecutor(temp))
            false
        }

        val meteringPoint1 = meteringPointFactory.createPoint(
            cameraView.width.toFloat() / 2,
            cameraView.height.toFloat() / 2
        )
        val action = FocusMeteringAction.Builder(meteringPoint1) // default AF|AE|AWB
            // The action is canceled in 3 seconds (if not set, default is 5s).
            .setAutoCancelDuration(3, TimeUnit.SECONDS)
            .build()

        val result = cameraControl.startFocusAndMetering(action)
        // Adds listener to the ListenableFuture if you need to know the focusMetering result.
        result.addListener({
            // result.get().isFocusSuccessful returns if the auto focus is successful or not.
        }, ContextCompat.getMainExecutor(this))

    }
}

class detector(barcodeInfo: TextView) : DetectionTaskCallback<List<Barcode>> {
    private val bcode = barcodeInfo
    override fun onDetectionTaskReceived(task: Task<List<Barcode>>) {
        task.addOnSuccessListener { barcodeList ->
            for (x in barcodeList) {
                Log.println(Log.DEBUG, "SCANNER", x.rawValue ?: "failed barcode scan")
                bcode.text = "${x.rawValue ?: "failed barcode scan  "}format: ${x.format}"
            }
        }
    }

}
