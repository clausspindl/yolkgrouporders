"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Building2, Copy, FileText } from "lucide-react"
import { supabase, type RealtimeGroupOrder, signOut } from "@/lib/supabase"
import { useAuth } from "../context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import GroupOrderDashboardModal from "../components/GroupOrderDashboardModal"
import Link from "next/link"

// Venues data (same as in main page)
const venues = [
  { id: "soho", name: "Soho", address: "123 Soho Street, London W1D 3QU", lat: 51.5138, lng: -0.1364 },
  { id: "canary-wharf", name: "Canary Wharf", address: "456 Canary Wharf, London E14 5AB", lat: 51.5054, lng: -0.0235 },
  { id: "new-oxford-st", name: "New Oxford Street", address: "789 New Oxford Street, London WC1A 1BS", lat: 51.5165, lng: -0.1260 },
  { id: "old-street", name: "Old Street", address: "321 Old Street, London EC1V 9DR", lat: 51.5265, lng: -0.0876 },
  { id: "kings-cross", name: "Kings Cross", address: "654 Kings Cross Road, London N1 9AP", lat: 51.5320, lng: -0.1233 },
  { id: "waterloo", name: "Waterloo", address: "987 Waterloo Road, London SE1 8SW", lat: 51.5033, lng: -0.1145 },
  { id: "paddington", name: "Paddington", address: "147 Paddington Street, London W2 1LA", lat: 51.5154, lng: -0.1755 },
  { id: "victoria", name: "Victoria", address: "258 Victoria Street, London SW1E 5NE", lat: 51.4965, lng: -0.1444 },
  { id: "euston", name: "Euston", address: "369 Euston Road, London NW1 2RT", lat: 51.5285, lng: -0.1339 },
  { id: "liverpool-street", name: "Liverpool Street", address: "741 Liverpool Street, London EC2M 7PY", lat: 51.5175, lng: -0.0820 }
]



export default function OrdersPage() {
  const { user, isManager } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<RealtimeGroupOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<RealtimeGroupOrder | null>(null)
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false)

  useEffect(() => {
    if (user && isManager) {
      loadOrders()
    }
  }, [user, isManager])

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('group_orders')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading orders:', error)
      } else {
        setOrders(data || [])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Link copied!",
        description: "Shareable link copied to clipboard",
      })
    } catch (err) {
      console.error('Failed to copy: ', err)
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      })
    }
  }

  const generateOrderUrl = (orderId: string) => {
    return `${window.location.origin}?group-order=${orderId}`
  }



  const openGroupOrderDashboard = (order: RealtimeGroupOrder) => {
    setSelectedOrder(order)
    setDashboardModalOpen(true)
  }

  const closeDashboardModal = () => {
    setDashboardModalOpen(false)
    setSelectedOrder(null)
    // Refresh orders list in case any orders were updated
    loadOrders()
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
                  className="text-black hover:text-gray-700 font-medium bg-black/10 px-3 py-1 rounded" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  MY ORDERS
                </button>
                {user && (
                  <button 
                    onClick={() => window.location.href = '/account'}
                    className="text-black hover:text-gray-700 font-medium" 
                    style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                  >
                    ACCOUNT
                  </button>
                )}
              </div>
            </div>
            
            {/* Sign Out Button - Always show when signed in */}
            {user && (
              <div className="flex items-center ml-4">
                <Button
                  onClick={async () => {
                    await signOut()
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

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-12">
          <div>
            <h1 className="text-4xl font-light uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              My Group Orders
            </h1>
            <p className="text-zinc-400">Manage your team orders</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
              <p className="text-black text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                LOADING ORDERS...
              </p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="space-y-4">
              <Users className="h-16 w-16 mx-auto text-gray-400" />
              <h2 className="text-2xl font-medium text-white" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                No Group Orders Yet
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Create your first group order to get started. Share the link with your team and let them choose their own items.
              </p>
              <Button
                onClick={() => window.location.href = '/'}
                className="bg-[#f8f68f] text-black hover:bg-[#e6e346] mt-4"
              >
                Create Group Order
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {orders.map((order) => (
                             <motion.div
                 key={order.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6 }}
               >
                 <Card 
                   className="bg-zinc-100/50 border-zinc-200 hover:border-zinc-300 transition-colors cursor-pointer"
                   onClick={() => openGroupOrderDashboard(order)}
                 >
                                     <CardHeader>
                     <div className="flex items-center justify-between">
                       <CardTitle className="text-black uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                         Order #{order.id}
                       </CardTitle>
                       <div className="flex items-center space-x-2 text-xs">
                         <Badge className={`${
                           order.status === 'draft' 
                             ? 'bg-blue-600 text-white' 
                             : order.status === 'waiting_for_payment'
                             ? 'bg-orange-500 text-white'
                             : 'bg-green-500 text-white'
                         }`}>
                           {order.status === 'draft' ? 'DRAFT' : 
                            order.status === 'waiting_for_payment' ? 'WAITING FOR PAYMENT' : 
                            'FINALIZED'}
                         </Badge>
                       </div>
                     </div>
                    <CardDescription className="text-gray-400">
                      Created {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Building2 className="h-4 w-4 text-black" />
                        <span className="text-zinc-800">Venue:</span>
                        <span className="text-black">YOLK {venues.find(v => v.id === order.venue)?.name || order.venue}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-black" />
                        <span className="text-zinc-800">Date:</span>
                        <span className="text-black">
                          {new Date(order.time).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="h-4 w-4 text-black" />
                        <span className="text-zinc-800">Team Size:</span>
                        <span className="text-black">{order.team_size} people</span>
                      </div>
                    </div>

                                         {order.status === 'draft' && (
                                           <div className="flex items-center space-x-2 pt-4 border-t border-zinc-700">
                                             <Button
                                               onClick={(e) => {
                                                 e.stopPropagation() // Prevent opening the modal
                                                 copyToClipboard(generateOrderUrl(order.id))
                                               }}
                                               size="sm"
                                               variant="outline"
                                               className="border-zinc-200 text-white hover:bg-zinc-800 flex-1"
                                             >
                                               <Copy className="h-4 w-4 mr-2" />
                                               Copy Link
                                             </Button>
                                           </div>
                                         )}
                                         {order.status === 'finalized' && (
                                           <div className="flex items-center space-x-2 pt-4 border-t border-zinc-700">
                                             <Button
                                               onClick={(e) => {
                                                 e.stopPropagation() // Prevent opening the modal
                                                 openGroupOrderDashboard(order)
                                               }}
                                               size="sm"
                                               variant="outline"
                                               className="border-zinc-200 text-white hover:bg-zinc-800 flex-1"
                                             >
                                               <FileText className="h-4 w-4 mr-2" />
                                               Order Details
                                             </Button>
                                           </div>
                                         )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-zinc-800 mt-auto">
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

      {/* Group Order Dashboard Modal */}
      <GroupOrderDashboardModal
        isOpen={dashboardModalOpen}
        onClose={closeDashboardModal}
        groupOrder={selectedOrder}
      />
      
      <Toaster />
    </div>
  )
} 