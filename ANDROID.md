# Build the Android app (Android Studio)

Requirements: Node.js 20+, Android Studio (with Android SDK), Git.

1. Export this project to GitHub (Lovable: GitHub button) and clone it to your computer.
2. In the project folder run, in this exact order:
   ```
   npm install
   npm run build:android      # builds the offline app into dist/client (creates index.html)
   npx cap add android        # first time only, creates the android/ folder
   npx cap sync android       # copies the app files into android/
   npx cap open android       # opens the project in Android Studio
   ```
3. In Android Studio: wait for Gradle sync, then Run ▶ on a phone/emulator,
   or Build > Generate Signed Bundle / APK to create an installable APK.

IMPORTANT:
- Do NOT run plain `npm run build` before `cap add android`. Only
  `npm run build:android` creates the `index.html` Capacitor needs (in `dist/client`).
- `capacitor.config.ts` must keep `webDir: "dist/client"`. If yours says
  `.output/server` or anything else, change it back to `dist/client`.
- If `cap add android` failed before, delete the half-created `android` folder
  and start again from step 2.

After any code change, run `npm run build:android` again (it already runs `cap sync`).
All data stays on the phone (localStorage). Use Settings > Download backup regularly.
