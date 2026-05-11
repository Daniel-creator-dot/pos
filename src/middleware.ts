import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Get user role from token
    const role = token?.role?.name as string | undefined;
    const permissions = token?.role?.permissions
      ? JSON.parse(token.role.permissions as string)
      : [];

    // Check if user has permission to access the route
    const hasPermission = (route: string) => {
      // Admin and Superadmin have full access
      if (role === "admin" || role === "superadmin") return true;
      
      // Check specific permissions
      return permissions.includes("*") || permissions.includes(route);
    };

    // Role-based route restrictions
    const roleRestrictions: Record<string, string[]> = {
      cashier: ["pos", "sales_history_own"],
      storekeeper: ["products_view", "stock", "purchases"],
      manager: ["dashboard", "pos", "products", "stock", "purchases", "reports", "sales_history"],
      superadmin: ["admin_companies", "admin_dashboard"],
    };

    // Determine required permission for the route
    const routePermissionMap: Record<string, string> = {
      "/dashboard": "dashboard",
      "/pos": "pos",
      "/products": "products",
      "/categories": "products",
      "/stock": "stock",
      "/purchases": "purchases",
      "/suppliers": "purchases",
      "/sales": "sales_history",
      "/reports": "reports",
      "/users": "users",
      "/settings": "settings",
      "/admin": "admin_dashboard",
    };

    // Special handling for superadmin
    if (role === "superadmin" && !pathname.startsWith("/admin") && pathname !== "/") {
       return NextResponse.redirect(new URL("/admin/companies", req.url));
    }

    // Check if route requires specific permission
    for (const [route, permission] of Object.entries(routePermissionMap)) {
      if (pathname.startsWith(route) && !hasPermission(permission)) {
        // Special case: cashiers can access /sales to view their own sales
        if (pathname.startsWith("/sales") && role === "cashier") {
          return NextResponse.next();
        }
        
        // Special case: storekeepers can access /products and /suppliers
        if (pathname.startsWith("/products") && role === "storekeeper") {
          return NextResponse.next();
        }
        if (pathname.startsWith("/suppliers") && role === "storekeeper") {
          return NextResponse.next();
        }
        
        // Redirect to appropriate page based on role
        if (role === "cashier") {
          return NextResponse.redirect(new URL("/pos", req.url));
        }
        if (role === "storekeeper") {
          return NextResponse.redirect(new URL("/stock", req.url));
        }
        if (role === "superadmin") {
          return NextResponse.redirect(new URL("/admin/companies", req.url));
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/stock/:path*",
    "/purchases/:path*",
    "/suppliers/:path*",
    "/sales/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};