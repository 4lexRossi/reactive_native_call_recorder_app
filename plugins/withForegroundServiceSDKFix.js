const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withForegroundServiceSDKFix(config) {
  return withProjectBuildGradle(config, async (config) => {
    let buildGradle = config.modResults.contents;
    
    // Check if our block is already added
    if (!buildGradle.includes('voximplant_react-native-foreground-service')) {
      const overrideBlock = `
// EXPO_CONFIG_PLUGIN_START: voximplant-foreground-service-sdk-override
subprojects { project ->
    if (project.name == 'voximplant_react-native-foreground-service') {
        def configureSdk = {
            project.android {
                compileSdkVersion 34
                buildToolsVersion "34.0.0"
                defaultConfig {
                    targetSdkVersion 34
                }
            }
        }
        if (project.state.executed) {
            configureSdk()
        } else {
            project.afterEvaluate {
                configureSdk()
            }
        }
    }
}
// EXPO_CONFIG_PLUGIN_END: voximplant-foreground-service-sdk-override
`;
      buildGradle += overrideBlock;
      config.modResults.contents = buildGradle;
    }
    
    return config;
  });
};
