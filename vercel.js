{
  "rewrites": [
    { "source": "/", "destination": "/public/landing/index.html" },
    { "source": "/auth/:path*", "destination": "/public/auth/:path*" },
    { "source": "/chat/:path*", "destination": "/public/chat/:path*" },
    { "source": "/app/:path*", "destination": "/public/app/:path*" },
    { "source": "/profile/:path*", "destination": "/public/profile/:path*" },
    { "source": "/shared/:path*", "destination": "/public/shared/:path*" }
  ]
}
