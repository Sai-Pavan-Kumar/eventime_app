# EvenTime — Google Play Store Launch & Listing Kit

Everything required to fill out Google Play Console forms, publish the app, and pass Google Play review on the first attempt.

---

## 1. Store Listing Details

### App Name (Max 30 chars)
```
EvenTime: Events & Campus Life
```

### Short Description (Max 80 chars)
```
Discover college fests, tech hackathons, workshops & local events near you.
```

### Full Description (Max 4000 chars)
```
🎉 Welcome to EvenTime — India's premier curated student & tech event discovery platform!

Whether you are looking for college fests, 24-hour hackathons, coding workshops, startup conferences, music gigs, or local meetups in your city, EvenTime brings everything happening around you into one fast, aesthetic feed.

✨ KEY FEATURES:

🔥 Curated Live Feeds:
• Explore events across Tech, Hackathons, Cultural Fests, Sports, Workshops, and Networking.
• Segment feeds by "For You" (personalized to your interests), "Around You" (local to your city), and "Campus" (college-exclusive announcements).

🏛️ Campus & College Hubs:
• Never miss a fest, workshop, or competition happening at your university or partner campuses across India.
• Exclusive notices and student-only event registration links.

⏰ Smart 24-Hour Reminders & Push Alerts:
• Save events you are interested in and get automated reminders 24 hours before the event starts.
• Real-time alerts for newly published events in your favorite cities.

🏆 Curator Community & Leaderboards:
• Verified curators earn community points for listing high-quality events.
• Compete on the leaderboard and showcase your curation badge.

📍 City-Level Exploration:
• Filter events across Hyderabad, Bengaluru, Mumbai, Delhi-NCR, Chennai, Pune, and all major student hubs.
• Date filter to check what is happening today, this weekend, or next month.

🛡️ Privacy-First & DPDP Act 2023 Compliant:
• Zero intrusive tracking or background battery drain.
• Full transparency with one-tap account and data erasure anytime from Settings.

Join thousands of students and young professionals discovering memorable events on EvenTime!

Website: https://eventime.thesurfboard.in
Support: eventime.admin@gmail.com
```

---

## 2. Categorization & Contact Details

| Field | Value |
|---|---|
| **App Category** | Events (or Education / Lifestyle) |
| **Tags** | Events, College Life, Hackathons, Meetups, Workshops |
| **Support Email** | `eventime.admin@gmail.com` |
| **Support Website** | `https://eventime.thesurfboard.in` |
| **Privacy Policy URL** | `https://eventime.thesurfboard.in/privacy` |
| **Terms of Service URL** | `https://eventime.thesurfboard.in/terms` |

---

## 3. Data Safety Declaration (Google Play Form)

Fill in the Google Play Console **Data Safety** questionnaire with these exact answers:

### Data Collection & Sharing:
* **Does your app collect or share any user data?** 👉 **Yes**
* **Is all data encrypted in transit?** 👉 **Yes** (All requests go through HTTPS / TLS to Supabase & Cloudflare CDN).
* **Do you provide a way for users to request data deletion?** 👉 **Yes** (Settings Screen includes a one-tap "Delete Account & Wipe Data" DPDP compliant button, and email deletion requests are supported).

### Data Types Collected:
1. **Personal Info:**
   - **Name:** Collected for profile display (Optional).
   - **Email address:** Collected for account authentication & notifications (Required).
   - **User IDs:** Account identifier (Supabase Auth UID).
2. **Location (Coarse/Self-selected):**
   - **Preferred Cities:** Collected purely for filtering the event feed (Optional, selected in settings; NO GPS tracking used).
3. **App Info & Performance:**
   - **Crash logs & Diagnostics:** Performance monitoring (Anonymized).
4. **Device or other IDs:**
   - **Push Notification Token:** Used exclusively to deliver event reminders and campus alerts to the device (Optional).

---

## 4. Content Rating Questionnaire

* **Target Audience:** 13+ (Teens, College Students, Young Professionals).
* **Violence / Sexual Content / Profanity:** None (No).
* **User-Generated Content:** Yes (Event listings undergo community reporting & moderation rules).
* **Location Sharing:** No physical GPS tracking shared with other users.
* **Digital Purchases:** No in-app purchases.
* **Rating Result:** **Everyone (PEGI 3 / ESRB Everyone)**.

---

## 5. Graphic Assets Checklist

| Asset | Specifications | Status |
|---|---|---|
| **App Icon** | 512 x 512 px, 32-bit PNG, max 1MB | Generated (`assets/icon.png`) |
| **Feature Graphic** | 1024 x 500 px, JPG or 24-bit PNG, max 15MB | Banner with EvenTime logo & gradient |
| **Phone Screenshots** | Min 2, max 8 screenshots (1080 x 2400 or 1080 x 1920) | Capture HomeScreen, EventDetail, Search, Onboarding |

---

## 6. Production Build & Release Instructions

### Option 1: EAS Cloud Build (Recommended & Automated)
```bash
# 1. Install EAS CLI globally if not already installed
npm install -g eas-cli

# 2. Login to your Expo account
eas login

# 3. Configure EAS project (first time only)
eas init

# 4. Build Standalone Test APK (Install on any Android phone directly)
eas build --profile preview --platform android

# 5. Build Google Play Store AAB (Android App Bundle)
eas build --profile production --platform android
```
*Note: EAS automatically generates, securely stores, and manages your production keystore in the cloud without risk of losing it.*

### Option 2: Local Release Build (Using Android Studio)
```bash
# Run local Android build
npx expo run:android --variant release
```
