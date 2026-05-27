import { useState, useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult, User } from 'firebase/auth';
import { auth } from '../firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First handle redirect result, then start auth listener
    const init = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setUser(result.user);
        }
      } catch (error: any) {
        if (error.code !== 'auth/no-auth-event') {
          console.error('Redirect result error:', error);
        }
      }

      // Start auth state listener after redirect is processed
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });

      return unsubscribe;
    };

    let unsubscribeFn: (() => void) | undefined;
    init().then(unsub => { unsubscribeFn = unsub; });

    return () => { if (unsubscribeFn) { unsubscribeFn(); } };
  }, []);

  return { user, loading };
};
