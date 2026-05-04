import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      roleId: string;
      storeId: string | null;
      role: {
        name: string;
        permissions: string;
      };
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    roleId: string;
    storeId: string | null;
    role: {
      name: string;
      permissions: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleId: string;
    storeId: string | null;
    role: {
      name: string;
      permissions: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Dynamic import of Prisma to avoid module loading issues
        const { prisma } = await import("./prisma");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            role: true,
          },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          storeId: user.storeId,
          role: {
            name: user.role.name,
            permissions: user.role.permissions,
          },
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleId = user.roleId;
        token.storeId = user.storeId;
        token.role = {
          name: user.role.name,
          permissions: user.role.permissions,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleId = token.roleId as string;
        session.user.storeId = token.storeId as string | null;
        session.user.role = {
          name: (token.role as { name: string; permissions: string })?.name || "",
          permissions: (token.role as { name: string; permissions: string })?.permissions || "[]",
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};