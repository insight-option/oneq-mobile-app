// Expo config plugin: start the app right-to-left on the very first launch.
// React Native persists the layout direction natively (I18nUtil / RCTI18nUtil) and only applies a change on the next
// process start, so without this an Arabic-first app renders its first launch left-to-right. The snippet enables RTL
// before React starts, but only while no preference has been persisted yet — the in-app language switch
// (I18nManager.forceRTL from src/i18n/index.ts) keeps full control afterwards.
/* eslint-env node */
const { withAppDelegate, withMainApplication, createRunOncePlugin } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const TAG = 'oneq-native-rtl';

const ANDROID_IMPORT = 'import com.facebook.react.modules.i18nmanager.I18nUtil';
const ANDROID_SNIPPET = `    // ${TAG}: Arabic-first — RTL before the first JS run; later launches keep the persisted in-app choice
    val rtlPrefs = getSharedPreferences("com.facebook.react.modules.i18nmanager.I18nUtil", MODE_PRIVATE)
    if (!rtlPrefs.contains("RCTI18nUtil_forceRTL")) {
      I18nUtil.instance.allowRTL(this, true)
      I18nUtil.instance.forceRTL(this, true)
    }`;

const IOS_SNIPPET = `    // ${TAG}: Arabic-first — RTL before the first JS run; later launches keep the persisted in-app choice
    if UserDefaults.standard.object(forKey: "RCTI18nUtil_forceRTL") == nil {
      RCTI18nUtil.sharedInstance().allowRTL(true)
      RCTI18nUtil.sharedInstance().forceRTL(true)
    }`;

const withAndroidRtl = (config) =>
  withMainApplication(config, (mod) => {
    let src = mod.modResults.contents;
    if (!src.includes(ANDROID_IMPORT)) src = src.replace(/^(package [^\n]+\n)/, `$1\n${ANDROID_IMPORT}\n`);
    src = mergeContents({ src, newSrc: ANDROID_SNIPPET, anchor: /super\.onCreate\(\)/, offset: 1, tag: `${TAG}-android`, comment: '//' }).contents;
    mod.modResults.contents = src;
    return mod;
  });

const withIosRtl = (config) =>
  withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') return mod; // Objective-C templates are not used by this project
    mod.modResults.contents = mergeContents({ src: mod.modResults.contents, newSrc: IOS_SNIPPET, anchor: /\) -> Bool \{/, offset: 1, tag: `${TAG}-ios`, comment: '//' }).contents;
    return mod;
  });

const withNativeRtl = (config) => withIosRtl(withAndroidRtl(config));

module.exports = createRunOncePlugin(withNativeRtl, TAG, '1.0.0');
