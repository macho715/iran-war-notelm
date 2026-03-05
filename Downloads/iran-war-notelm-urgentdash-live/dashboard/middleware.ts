import { NextResponse, type NextRequest } from "next/server";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Iran-UAE Monitor"'
    }
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // If not configured, do nothing (public).
  if (!user || !pass) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return unauthorized();
  }

  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return unauthorized();
  }

  try {
    const decoded = atob(encoded);
    const sep = decoded.indexOf(":");
    const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const p = sep >= 0 ? decoded.slice(sep + 1) : "";
    if (u === user && p === pass) {
      return NextResponse.next();
    }
    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
