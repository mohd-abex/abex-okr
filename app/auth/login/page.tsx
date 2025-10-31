"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Orange Background with Image (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FF8356] flex-col items-center justify-center p-12 text-center">
        {/* Hero Text */}
        <div className="mb-8">
          <h2 className="text-5xl font-semibold text-white mb-4">
            Align. Focus. Achieve.
          </h2>
          <p className="text-lg text-white/90 font-light max-w-md leading-relaxed">
            OKRs help your team stay aligned, track progress, and reach goals
            faster — <span className="text-gray-600">all in one place.</span>
          </p>
        </div>

        {/* Illustration */}
        <div className="max-w-xl">
          <Image
            src="/login.png"
            alt="Register illustration"
            width={400}
            height={400}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-2">
              <Image
                src="/logo.svg"
                alt="abex.work"
                width={140}
                height={40}
                priority
              />
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-gray-900">OKR</span>
              <div className="w-2 h-2 bg-[#FF8356] rounded-full"></div>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 font-serif">
              Login Into Account
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-bold text-gray-500"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 px-4 border-gray-200 focus:border-[#FF8356] focus:ring-[#FF8356]"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-bold text-gray-500"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 px-4 border-gray-200 focus:border-[#FF8356] focus:ring-[#FF8356]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#FF8356] hover:bg-[#FF9576] text-white font-medium rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}
            </Button>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-sm text-gray-500">Or</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <div className="text-center text-sm text-gray-600 mt-6">
              New Organization?{" "}
              <Link
                href="/auth/register"
                className="text-[#FF8356] hover:text-[#FF9576] font-medium"
              >
                Create One
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
