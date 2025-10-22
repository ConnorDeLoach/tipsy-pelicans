import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isAuthApi = createRouteMatcher(["/api/auth(.*)"]);
const isRsvpPage = createRouteMatcher(["/rsvp"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  if (isSignInPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/");
  }

  if (
    !authed &&
    !isSignInPage(request) &&
    !isAuthApi(request) &&
    !isRsvpPage(request)
  ) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
