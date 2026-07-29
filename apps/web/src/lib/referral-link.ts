export const referralRegistrationUrl = (origin: string, code: string) => {
  const url = new URL("/register", origin);
  url.searchParams.set("invite", code);
  url.searchParams.set("next", "/dashboard/referrals");
  return url.toString();
};
