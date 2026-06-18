import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes: landing page, auth screens, social-card images, manifest.
// The actual app lives under /app and stays protected.
const isPublic = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/opengraph-image(.*)',
  '/twitter-image(.*)',
  '/manifest.webmanifest',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
