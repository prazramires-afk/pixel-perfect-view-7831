# Build the Android app (Android Studio)

Requirements: Node.js 20+, Android Studio (with Android SDK), Git.

1. Export this project to GitHub (Lovable: GitHub button) and clone it to your computer.
2. In the project folder run:
   npm install
   npx cap add android        # first time only, creates the android/ folder
   npm run build:android      # builds the offline app and copies it into android/
   npx cap open android       # opens the project in Android Studio
3. In Android Studio: wait for Gradle sync, then Run ▶ on a phone/emulator,
   or Build > Generate Signed Bundle / APK to create an installable APK.

After any code change, run `npm run build:android` again.
All data stays on the phone (localStorage). Use Settings > Download backup regularly.
