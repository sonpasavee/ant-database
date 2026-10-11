import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SECONDS = 30 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user }) {
      // Enforce a fixed 30-minute lifetime even if a session check renews the cookie.
      if (
        typeof token.iat === "number" &&
        Date.now() >= (token.iat + SESSION_MAX_AGE_SECONDS) * 1000
      ) {
        return null;
      }

      if (user?.id) {
        const databaseUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        if (!databaseUser) {
          throw new Error("Authenticated user was not found");
        }

        token.role = databaseUser.role;
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      return session;
    },
  },

  providers: [
    Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email);
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
