
import { getDatabase, ref, get, set, push } from "firebase/database";

const ADMIN_UID = "2Fd1fm8oKXakzZUuNx0gSxE2Jcx1";

export async function initUserData(user) {
  const db = getDatabase();
  const userRef = ref(db, `users/${user.uid}`);

  if (user.uid === ADMIN_UID) {
    // Admin user logic
    console.log("Admin user logged in:", user.uid);
    const earningsProfilesRef = ref(db, `users/${user.uid}/earnings_profiles`);
    const snapshot = await get(earningsProfilesRef);
    const profiles = snapshot.val();

    const requiredProfiles = [
      { name: "Strony", type: "freelance" },
      { name: "Resale", type: "resale" },
      { name: "Giełda", type: "investments" },
    ];

    for (const requiredProfile of requiredProfiles) {
      const profileExists = Object.values(profiles || {}).some(
        (profile) =>
          profile.name === requiredProfile.name &&
          profile.type === requiredProfile.type
      );

      if (!profileExists) {
        console.log(`Migrating data for ${requiredProfile.name} profile.`);
        // Here you would implement the migration logic.
        // For now, let's just create the profile.
        await push(earningsProfilesRef, requiredProfile);
      }
    }
  } else {
    // Regular user logic
    console.log("Regular user logged in:", user.uid);
    const userSnapshot = await get(userRef);
    const userData = userSnapshot.val();

    if (!userData || !userData.isConfigured) {
      console.log("New user or user not configured. Setting needsOnboarding to true.");
      await set(ref(db, `users/${user.uid}/needsOnboarding`), true);
    }
  }
}
