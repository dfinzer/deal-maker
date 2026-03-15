import { NextRequest, NextResponse } from "next/server";

const PASSWORD = "dealmaker2026";
const COOKIE_NAME = "dm-auth";

export function middleware(req: NextRequest) {
  // Skip auth for the login API route
  if (req.nextUrl.pathname === "/api/login") {
    return NextResponse.next();
  }

  // Authenticated via cookie
  if (req.cookies.get(COOKIE_NAME)?.value === PASSWORD) {
    return NextResponse.next();
  }

  // Show login page
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deal Maker - Login</title>
<style>
  body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
  .box{background:#111;border:1px solid #333;border-radius:12px;padding:2rem;width:320px;text-align:center}
  h1{font-size:1.5rem;margin:0 0 1.5rem}
  input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#e5e5e5;font-size:1rem;box-sizing:border-box;margin-bottom:1rem}
  button{width:100%;padding:10px;border-radius:8px;border:none;background:#10b981;color:#fff;font-size:1rem;cursor:pointer;font-weight:500}
  button:hover{background:#059669}
  .err{color:#f87171;font-size:0.875rem;margin-top:0.5rem;display:none}
</style></head><body>
<div class="box">
  <h1>Deal Maker</h1>
  <form id="f">
    <input type="password" id="p" placeholder="Password" autofocus>
    <button type="submit">Enter</button>
    <div class="err" id="e">Wrong password</div>
  </form>
</div>
<script>
document.getElementById('f').onsubmit=async e=>{
  e.preventDefault();
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('p').value})});
  if(r.ok)location.reload();
  else document.getElementById('e').style.display='block';
};
</script></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
