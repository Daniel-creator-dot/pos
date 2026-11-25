export function publicLoginError(serverError: string) {
  if (
    serverError === "CredentialsSignin" ||
    serverError === "Invalid email or password"
  ) {
    return "Invalid email or password";
  }

  if (
    /database|shop tables|deactivated|suspended|required/i.test(serverError)
  ) {
    return serverError;
  }

  return "Invalid email or password";
}
