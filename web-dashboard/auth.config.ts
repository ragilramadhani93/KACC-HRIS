import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    providers: [], // Configured in auth.ts
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname === '/';
            const isOnLogin = nextUrl.pathname.startsWith('/login');
            const isOnApi = nextUrl.pathname.startsWith('/api');

            if (isOnApi) return true; // Allow API access for now (or secure it differently)

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isOnLogin) {
                if (isLoggedIn) {
                    return Response.redirect(new URL('/', nextUrl)); // Redirect logged-in users to dashboard
                }
                return true;
            }
            return true; // Allow access to other pages (like /public if any)
        },
    },
} satisfies NextAuthConfig;
