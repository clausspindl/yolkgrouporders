"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Mail, MapPin, Users, Save, ArrowLeft } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface CompanyProfile {
  id?: string
  user_id: string
  company_name: string
  company_address: string
  company_size: string
  contact_person: string
  phone: string
  created_at?: string
  updated_at?: string
}

export default function AccountPage() {
  const { user, isManager } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<CompanyProfile>({
    user_id: user?.id || '',
    company_name: '',
    company_address: '',
    company_size: '',
    contact_person: '',
    phone: ''
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading profile:', error)
      } else if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('company_profiles')
        .upsert({
          ...profile,
          user_id: user?.id,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving profile:', error)
        toast({
          title: "Error",
          description: "Failed to save profile. Please try again.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: "Profile saved successfully!",
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Redirect if not a manager
  if (!isManager) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
            Manager Access Required
          </h1>
          <p className="text-gray-400">You need to be signed in as a manager to view this page.</p>
          <Button
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-[#f8f68f] text-black hover:bg-[#e6e346]"
          >
            Sign In as Manager
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: '#F8F68F' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* YOLK Brand */}
              <div className="flex items-center">
                <img 
                  src="/yolk-black.svg" 
                  alt="YOLK" 
                  className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.location.href = '/'}
                />
              </div>
              
              {/* Navigation Items */}
              <div className="flex items-center space-x-6 text-xl">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  ORDER
                </button>
                <a href="#" className="text-black hover:text-gray-700 font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  LOCATIONS
                </a>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  MENUS
                </button>
                <button 
                  onClick={() => window.location.href = '/orders'}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  MY ORDERS
                </button>
                <button 
                  onClick={() => window.location.href = '/account'}
                  className="text-black hover:text-gray-700 font-medium bg-black/10 px-3 py-1 rounded" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  ACCOUNT
                </button>
              </div>
            </div>
            
            {/* Sign Out Button - Always show when signed in */}
            {user && (
              <div className="flex items-center ml-4">
                <Button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.href = '/'
                  }}
                  variant="outline"
                  size="sm"
                  className="border-black text-[#f8f68f] hover:bg-black hover:text-white text-sm"
                >
                  Sign Out
                </Button>
              </div>
            )}

            {/* Sign In Button - Only show when not signed in */}
            {!user && (
              <Button
                onClick={() => window.location.href = '/auth/signin'}
                className="bg-black text-[#f8f68f] hover:bg-gray-800 font-medium text-sm"
              >
                Log in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6 pt-12">
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div>
            <h1 className="text-4xl font-light uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              Account Settings
            </h1>
            <p className="text-zinc-400">Manage your company profile</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f8f68f] mx-auto"></div>
              <p className="text-[#f8f68f] text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                LOADING PROFILE...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-zinc-100 border-zinc-200">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-6 w-6 text-black" />
                    <CardTitle className="text-black uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      Company Information
                    </CardTitle>
                  </div>
                  <CardDescription className="text-zinc-800">
                    Update your company details for better service
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-900">Company Name</Label>
                    <Input
                      value={profile.company_name}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                      placeholder="Your Company Ltd."
                      className="bg-white/50 border-zinc-200 text-black placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-800">Company Address</Label>
                    <Textarea
                      value={profile.company_address}
                      onChange={(e) => setProfile({ ...profile, company_address: e.target.value })}
                      placeholder="123 Business Street, London, SW1A 1AA"
                      className="bg-white/50 border-zinc-200 text-black placeholder:text-gray-500 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-800">Company Size</Label>
                    <Select value={profile.company_size} onValueChange={(value) => setProfile({ ...profile, company_size: value })}>
                      <SelectTrigger className="bg-white/50 border-zinc-200 text-black">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-zinc-100/50 border-zinc-200">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-6 w-6 text-black" />
                    <CardTitle className="text-black uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      Contact Information
                    </CardTitle>
                  </div>
                  <CardDescription className="text-zinc-800">
                    Your contact details for order communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-800">Email Address</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-white/30 border-zinc-200 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-800">Contact Person</Label>
                    <Input
                      value={profile.contact_person}
                      onChange={(e) => setProfile({ ...profile, contact_person: e.target.value })}
                      placeholder="John Smith"
                      className="bg-white/50 border-zinc-200 text-black placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-800">Phone Number</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+44 20 7123 4567"
                      className="bg-white/50 border-zinc-200 text-black placeholder:text-gray-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex justify-end"
        >
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="bg-[#f8f68f] text-black hover:bg-[#e6e346] font-medium uppercase text-lg px-8"
            style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Save Profile</span>
              </div>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-zinc-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <img 
                  src="/yolk-white.svg" 
                  alt="YOLK" 
                  className="h-14 w-auto mr-3"
                />
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Next-level sandwiches for next-level teams. Because your office deserves better than bland.
              </p>
              <p className="text-[#f8f68f] font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                FROM YAWWWWN TO YOLK.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Quick Links
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    ORDER
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    LOCATIONS
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    MENUS
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Business Info */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Business Orders
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    BECOME PARTNER
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    GROUP PRICING
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    CATERING GUIDE
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-zinc-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 YOLK ALL RIGHTS RESERVED
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-sm" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                PRIVACY POLICY
              </a>
              <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-sm" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                TERMS
              </a>
              <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-sm" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                CAREERS
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Toaster for notifications */}
      <Toaster />
    </div>
  )
} 