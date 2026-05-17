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
`;
      contents = contents.replace('package com.anonymous.callrecorder', `package com.anonymous.callrecorder\n${imports}`);
    }

    // Replace the onCreate method and add companion object / other methods
    if (!contents.includes('companion object')) {
      const mainActivityBody = `
  companion object {
    private var instance: MainActivity? = null
    private var isRecordingActive = false

    fun setRecordingActive(active: Boolean) {
      isRecordingActive = active
    }

    fun enterPip() {
      instance?.enterPipMode()
    }

    fun exitPip() {
      try {
        val intent = android.content.Intent(instance, MainActivity::class.java)
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        instance?.startActivity(intent)
      } catch (e: Exception) {
        // Fallback for safety
      }
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    if (instance == this) {
      instance = null
    }
  }

  fun enterPipMode() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val aspectRatio = android.util.Rational(3, 2)
      val params = android.app.PictureInPictureParams.Builder()
        .setAspectRatio(aspectRatio)
        .build()
      enterPictureInPictureMode(params)
    }
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (isRecordingActive) {
      enterPipMode()
    }
  }
`;

      // Find the onCreate method and append "instance = this" inside it
      contents = contents.replace(
        'super.onCreate(null)',
        'super.onCreate(null)\n    instance = this'
      );

      // Insert MainActivity helper methods and companion object
      contents = contents.replace(
        'class MainActivity : ReactActivity() {',
        `class MainActivity : ReactActivity() {\n${mainActivityBody}`
      );
      
      // Append PipModule and PipPackage classes at the end of the file
      const extraClasses = `
class PipModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "PipModule"
  }

  @ReactMethod
  fun setRecordingActive(active: Boolean) {
    MainActivity.setRecordingActive(active)
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
