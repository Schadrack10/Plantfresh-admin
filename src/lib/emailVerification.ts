import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { useState } from "react";

export async function signUpWithVerification(
  auth: Auth,
  email: string,
  password: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function loginWithVerificationCheck(
  auth: Auth,
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user       = credential.user;

  if (!user.emailVerified) {
    await signOut(auth);
    const err: any = new Error("Please verify your email before logging in.");
    err.code        = "auth/email-not-verified";
    throw err;
  }

  return user;
}

export async function resendVerificationEmail(
  auth: Auth,
  email: string,
  password: string
): Promise<void> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  await signOut(auth);
}

export function useEmailVerification(auth: Auth, email: string, password: string) {
  const [notVerified, setNotVerified] = useState(false);
  const [resending,   setResending]   = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail(auth, email, password);
    } finally {
      setResending(false);
    }
  };

  return { notVerified, setNotVerified, handleResend, resending };
}