"use client";

import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await register(name, orgName, email, password, role);
    } catch (error) {
      setError("Registration failed. Please try again.");
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
          <h3 className="text-4xl font-semibold text-white mb-4">
            Align. Focus. Achieve.
          </h3>
          <p className="text-md text-white/90 font-light max-w-md leading-relaxed">
            OKRs help your team stay aligned, track progress, and reach goals
            faster — <span className="text-gray-600">all in one place.</span>
          </p>
        </div>

        {/* Illustration */}
        <div className="max-w-xl">
          <Image
            src="/login.png"
            alt="Register illustration"
            width={500}
            height={500}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>

      {/* Right Section - Register Form */}
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
            <h1 className="text-3xl font-semibold text-gray-900 mb-2 font-serif">
              Create Account
            </h1>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold text-gray-500">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 px-4 border-gray-200 focus:border-[#FF8356]0 focus:ring-[#FF8356]"
              />
            </div>

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

            <div className="space-y-2">
              <Label
                htmlFor="org_name"
                className="text-sm font-bold text-gray-500"
              >
                Company/Organization
              </Label>
              <Input
                id="org_name"
                required
                type="text"
                placeholder="Enter your organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="h-12 px-4 border-gray-200 focus:border-[#FF8356] focus:ring-[#FF8356]"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-3 mt-4">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) =>
                  setAgreedToTerms(checked as boolean)
                }
                className="mt-1"
              />
              <Label
                htmlFor="terms"
                className="text-sm text-gray-600 leading-relaxed"
              >
                I agree with and have read the{" "}
                <Link
                  href="https://abex.work/terms"
                  target="_blank"
                  className="text-[#FF8356] hover:text-[#FF9576]"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="https://abex.work/privacy"
                  target="_blank"
                  className="text-[#FF8356] hover:text-[#FF9576]"
                >
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#FF8356] hover:bg-[#FF9576] text-white font-medium rounded-lg mt-6"
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-sm text-gray-500">Or</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <div className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-[#FF8356] hover:text-[#FF9576] font-medium"
              >
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
