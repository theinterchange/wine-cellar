export function sendResetLink(email: string, resetUrl: string) {
  // Swap this for nodemailer/Resend in production
  console.log("\n========================================");
  console.log("PASSWORD RESET LINK");
  console.log(`To: ${email}`);
  console.log(`URL: ${resetUrl}`);
  console.log("========================================\n");
}
