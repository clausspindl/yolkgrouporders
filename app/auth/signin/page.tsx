"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { signInWithMagicLink } from "@/lib/supabase"
import Link from "next/link"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState("")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { error } = await signInWithMagicLink(email)
      
      if (error) {
        setError(error.message)
      } else {
        setIsSent(true)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link 
          href="/"
          className="inline-flex items-center text-[#f8f68f] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to YOLK
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <img 
                  src="/yolk-white.svg" 
                  alt="YOLK" 
                  className="h-12 w-auto"
                />
              </div>
              <CardTitle className="text-2xl font-light text-zinc-200" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Log in
              </CardTitle>
              <CardDescription className="text-gray-400">
                {isSent 
                  ? "Check your email for the magic link."
                  : "Enter your email to receive a secure sign-in link."
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {!isSent ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@company.com"
                      className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-[#f8f68f] text-black hover:bg-zinc-300 font-medium uppercase text-lg"
                    style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Send Magic Link</span>
                      </div>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="bg-[#f8f68f]/20 border border-[#f8f68f]/30 rounded-lg p-6">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[#f8f68f]" />
                    <h3 className="text-white font-medium text-lg mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      Check Your Email
                    </h3>
                    <p className="text-gray-300 text-sm">
                      We've sent a secure sign-in link to <strong>{email}.</strong>
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setIsSent(false)
                      setEmail("")
                    }}
                    variant="outline"
                    className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                  >
                    Try Different Email
                  </Button>
                </div>
              )}

              <div className="text-center pt-4 border-t border-zinc-800">
                <p className="text-gray-400 text-sm">
                  Check your spam folder if you don't see the email.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 