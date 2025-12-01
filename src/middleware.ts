import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isAuthApi = createRouteMatcher(["/api/auth(.*)"]);
const isRsvpPage = createRouteMatcher(["/rsvp"]);
const isHomePage = createRouteMatcher(["/"]);
const isMerchRoute = createRouteMatcher(["/merch(.*)"]);
const isMetaReviewPage = createRouteMatcher(["/meta-review"]);
const isPrivacyPolicyPage = createRouteMatcher(["/privacy-policy"]);
const isDataDeletionPage = createRouteMatcher(["/data-deletion"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const authed = await convexAuth.isAuthenticated();

    // If authenticated, redirect away from public entry points to dashboard
    if ((isHomePage(request) || isSignInPage(request)) && authed) {
      return nextjsMiddlewareRedirect(request, "/games");
    }

    if (
      !authed &&
      !isSignInPage(request) &&
      !isAuthApi(request) &&
      !isRsvpPage(request) &&
      !isHomePage(request) &&
      !isMerchRoute(request) &&
      !isMetaReviewPage(request) &&
      !isPrivacyPolicyPage(request) &&
      !isDataDeletionPage(request)
    ) {
      return nextjsMiddlewareRedirect(request, "/signin");
    }
  },
  {
    cookieConfig: {
      maxAge: 60 * 60 * 24 * 365, // 1 year
    },
  }
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
