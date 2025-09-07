import Echo from "@merit-systems/echo-next-sdk";

export const {
  // Echo Auth Routes
  handlers,

  // Server-side utils
  getUser,
  isSignedIn,

  // AI Providers
  openai,
  anthropic,
  google,
} = Echo({
  appId: process.env.ECHO_APP_ID || "6f0226b3-9d95-4d5a-96de-d178bd4dc9f7",
});
