"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(formData: { email: string; password: string }) {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password" };
    }
    return { success: false, error: "Something went wrong" };
  }
}
