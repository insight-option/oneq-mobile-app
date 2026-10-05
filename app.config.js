// Dynamic Expo config: extends app.json with values that come from the environment.
// - GOOGLE_MAPS_ANDROID_API_KEY: required for Google Maps tiles on Android builds (see README).
// - EAS_PROJECT_ID: set after `eas init` (needed for push notifications).
/* eslint-env node */
const base = require('./app.json');

module.exports = ({ config }) => {
  const expo = { ...base.expo, ...config };
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const plugins = [...(expo.plugins || [])];
  // Always declare a key: the Android Maps SDK aborts the whole app when the manifest has no API key.
  // Without a real key the map renders CARTO raster tiles (see src/components/shared/LocationPicker.tsx).
  plugins.push(['react-native-maps', { androidGoogleMapsApiKey: mapsKey || 'MISSING_GOOGLE_MAPS_KEY' }]);
  const extra = { ...(expo.extra || {}) };
  if (process.env.EAS_PROJECT_ID) {
    extra.eas = { ...(extra.eas || {}), projectId: process.env.EAS_PROJECT_ID };
  }
  extra.hasGoogleMapsKey = Boolean(mapsKey);
  return { ...expo, plugins, extra };
};
