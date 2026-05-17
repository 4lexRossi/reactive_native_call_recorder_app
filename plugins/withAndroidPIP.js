const { withAndroidManifest, withMainActivity, withMainApplication } = require('@expo/config-plugins');

function setPipManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const mainActivity = config.modResults.manifest.application[0].activity.find(
      (activity) => activity['$']['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      mainActivity['$']['android:supportsPictureInPicture'] = 'true';
      
      // Update configChanges if needed
      let configChanges = mainActivity['$']['android:configChanges'] || '';
      if (!configChanges.includes('smallestScreenSize')) {
        configChanges += '|smallestScreenSize|screenLayout|orientation|screenSize';
        mainActivity['$']['android:configChanges'] = configChanges;
      }
    }
    return config;
  });
}

function setPipMainActivity(config) {
  return withMainActivity(config, async (config) => {
    let contents = config.modResults.contents;
    
    // Add imports if they don't exist
    if (!contents.includes('import com.facebook.react.bridge.ReactMethod')) {
      const imports = `
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager
import java.util.ArrayList
import android.app.PendingIntent
import android.app.RemoteAction
import android.graphics.drawable.Icon
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.content.Context
import android.util.Rational
import android.app.PictureInPictureParams
`;
      contents = contents.replace('package com.anonymous.callrecorder', `package com.anonymous.callrecorder\n${imports}`);
    }

    // Replace the onCreate method and add companion object / other methods
    if (!contents.includes('companion object')) {
      const mainActivityBody = `
  companion object {
    private var instance: MainActivity? = null
    private var isRecordingActive = false
    private var isRecordingPaused = false
    private var reactContext: ReactApplicationContext? = null

    const val ACTION_MEDIA_CONTROL = "media_control"
    const val EXTRA_CONTROL_TYPE = "control_type"
    const val CONTROL_TYPE_PAUSE = 1
    const val CONTROL_TYPE_STOP = 2

    fun setRecordingActive(active: Boolean) {
      isRecordingActive = active
    }

    fun updatePipState(isPaused: Boolean) {
      isRecordingPaused = isPaused
      instance?.updatePipParams(isPaused)
    }

    fun setReactContext(context: ReactApplicationContext) {
      reactContext = context
    }

    fun emitPipEvent(action: String) {
      try {
        reactContext
          ?.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit("onPipAction", action)
      } catch (e: Exception) {
      }
    }

    fun enterPip() {
      instance?.enterPipMode()
    }

    fun exitPip() {
      try {
        val intent = Intent(instance, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        instance?.startActivity(intent)
      } catch (e: Exception) {
      }
    }
  }

  private val pipReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent == null || ACTION_MEDIA_CONTROL != intent.action) {
        return
      }
      val controlType = intent.getIntExtra(EXTRA_CONTROL_TYPE, 0)
      if (controlType == CONTROL_TYPE_PAUSE) {
        emitPipEvent("pause")
      } else if (controlType == CONTROL_TYPE_STOP) {
        exitPip()
        emitPipEvent("stop")
      }
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    try {
      unregisterReceiver(pipReceiver)
    } catch (e: Exception) {}
    if (instance == this) {
      instance = null
      reactContext = null
    }
  }

  fun updatePipParams(isPaused: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val actions = ArrayList<RemoteAction>()
      
      // Pause/Play Action
      val pauseIntent = Intent(ACTION_MEDIA_CONTROL).apply {
        putExtra(EXTRA_CONTROL_TYPE, CONTROL_TYPE_PAUSE)
      }
      val pausePendingIntent = PendingIntent.getBroadcast(
        this,
        CONTROL_TYPE_PAUSE,
        pauseIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val pauseIcon = Icon.createWithResource(
        this,
        if (isPaused) android.R.drawable.ic_media_play else android.R.drawable.ic_media_pause
      )
      val pauseAction = RemoteAction(
        pauseIcon,
        if (isPaused) "Resume" else "Pause",
        if (isPaused) "Resume" else "Pause",
        pausePendingIntent
      )
      actions.add(pauseAction)

      // Stop Action
      val stopIntent = Intent(ACTION_MEDIA_CONTROL).apply {
        putExtra(EXTRA_CONTROL_TYPE, CONTROL_TYPE_STOP)
      }
      val stopPendingIntent = PendingIntent.getBroadcast(
        this,
        CONTROL_TYPE_STOP,
        stopIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val stopIcon = Icon.createWithResource(
        this,
        android.R.drawable.ic_menu_close_clear_cancel
      )
      val stopAction = RemoteAction(
        stopIcon,
        "Stop",
        "Stop",
        stopPendingIntent
      )
      actions.add(stopAction)

      val aspectRatio = Rational(20, 10) // 2:1 widescreen horizontal bar (half the height!)
      val params = PictureInPictureParams.Builder()
        .setAspectRatio(aspectRatio)
        .setActions(actions)
        .build()
      setPictureInPictureParams(params)
    }
  }

  fun enterPipMode() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val aspectRatio = Rational(20, 10) // 2:1 ratio
      val params = PictureInPictureParams.Builder()
        .setAspectRatio(aspectRatio)
        .build()
      enterPictureInPictureMode(params)
      // Apply actions immediately
      updatePipParams(isRecordingPaused)
    }
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (isRecordingActive) {
      enterPipMode()
    }
  }
`;

      // Find the onCreate method and append registerReceiver
      contents = contents.replace(
        'super.onCreate(null)\n    instance = this',
        `super.onCreate(null)
    instance = this
    
    val filter = IntentFilter(ACTION_MEDIA_CONTROL)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(pipReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(pipReceiver, filter)
    }`
      );

      // Insert MainActivity helper methods and companion object
      contents = contents.replace(
        'class MainActivity : ReactActivity() {',
        `class MainActivity : ReactActivity() {\n${mainActivityBody}`
      );
      
      // Append PipModule and PipPackage classes at the end of the file
      const extraClasses = `
class PipModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  init {
    MainActivity.setReactContext(reactContext)
  }

  override fun getName(): String {
    return "PipModule"
  }

  @ReactMethod
  fun setRecordingActive(active: Boolean) {
    MainActivity.setRecordingActive(active)
  }

  @ReactMethod
  fun updatePipState(isPaused: Boolean) {
    MainActivity.updatePipState(isPaused)
  }

  @ReactMethod
  fun enterPip() {
    MainActivity.enterPip()
  }

  @ReactMethod
  fun exitPip() {
    MainActivity.exitPip()
  }
}

class PipPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    val modules = ArrayList<NativeModule>()
    modules.add(PipModule(reactContext))
    return modules
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;
      contents += extraClasses;
    }

    config.modResults.contents = contents;
    return config;
  });
}

function setPipMainApplication(config) {
  return withMainApplication(config, async (config) => {
    let contents = config.modResults.contents;
    
    if (!contents.includes('add(PipPackage())')) {
      // Find the PackageList packages apply block
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        'PackageList(this).packages.apply {\n              add(PipPackage())'
      );
    }
    
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withAndroidPIP(config) {
  return setPipMainApplication(setPipMainActivity(setPipManifest(config)));
};
