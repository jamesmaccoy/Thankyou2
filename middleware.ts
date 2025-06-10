import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const currentHost = host.replace(".yourdomain.com", "");
  if (
    currentHost &&
    currentHost !== "www" &&
    !host.startsWith("localhost")
  ) {
    return NextResponse.rewrite(
      new URL(`/s/${currentHost}${request.nextUrl.pathname}`, request.url)
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
