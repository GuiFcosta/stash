const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    content = `import { requireOptionalNativeModule } from 'expo-modules-core';
export default requireOptionalNativeModule('ExpoTopicSubscriptionModule') ?? {
    addListener: () => { },
    removeListeners: () => { },
    subscribeToTopicAsync: () => Promise.resolve(null),
    unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
`;
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch] Patched expo-notifications TopicSubscriptionModule.android.js for Expo Go support.');
  }
}
