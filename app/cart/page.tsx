"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Building2, ArrowRight, Plus, Minus, ShoppingCart, CheckCircle, X, MapPin, Truck, CreditCard, FileText, Users, Link, Clock, Search, ArrowLeft } from "lucide-react"
import { supabase, type RealtimeGroupOrder, type RealtimeGroupOrderItem, signOut } from "@/lib/supabase"
import { useAuth } from "../context/AuthContext"

// Available venues
const venues = [
  { id: "new-oxford-st", name: "New Oxford St", address: "102 New Oxford St, WC1A 1HB", lat: 51.5174, lng: -0.1278 },
  { id: "broadgate", name: "Broadgate", address: "Unit 2, 1 Finsbury Avenue, EC2M 2PP", lat: 51.5198, lng: -0.0863 },
  { id: "soho", name: "Soho", address: "19 Golden Square, London, W1F 9JJ", lat: 51.5127, lng: -0.1410 },
  { id: "new-st-square", name: "New St. Square", address: "3a New St. Sq, London, EC4A 3BF", lat: 51.5146, lng: -0.1070 },
  { id: "canary-wharf", name: "Canary Wharf", address: "15 Cabot Square, Unit RS-140, E14 4QT", lat: 51.5045, lng: -0.0199 },
  { id: "london-bridge", name: "London Bridge", address: "Unit D, 7 More London Riverside, SE1 2RT", lat: 51.5045, lng: -0.0865 },
  { id: "strand", name: "Strand", address: "82-83 Strand, WC2R 0DU", lat: 51.5099, lng: -0.1180 },
  { id: "london-wall", name: "London Wall", address: "150-151 Salisbury House, EC2M 5QD", lat: 51.5174, lng: -0.0934 },
  { id: "victoria", name: "Victoria", address: "Unit 14 Cardinal Place, SW1E 5JH", lat: 51.4952, lng: -0.1441 },
  { id: "high-holborn", name: "High Holborn", address: "90 High Holborn, WC1V 6LJ", lat: 51.5174, lng: -0.1204 },
]

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
}

interface CartItem extends MenuItem {
  quantity: number
}

interface LocalGroupOrder {
  id: string
  personName: string
  items: CartItem[]
  totalSpent: number
  timestamp: Date
}

export default function CartPage() {
  const { user, loading, isManager } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedVenue, setSelectedVenue] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [deliveryType, setDeliveryType] = useState<"delivery" | "collection" | "">("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"card" | "invoice">("card")
  const [showInvoiceApplication, setShowInvoiceApplication] = useState(false)
  const [isInvoiceApproved, setIsInvoiceApproved] = useState(false)
  const [showOrderComplete, setShowOrderComplete] = useState(false)
  const [isGroupOrderMode, setIsGroupOrderMode] = useState(false)
  const [groupOrderId, setGroupOrderId] = useState("")
  const [currentGroupOrder, setCurrentGroupOrder] = useState<RealtimeGroupOrder | null>(null)
  const [groupOrders, setGroupOrders] = useState<LocalGroupOrder[]>([])
  const [individualBudget, setIndividualBudget] = useState("")
  const [teamSize, setTeamSize] = useState("")

  // Load cart data from localStorage or URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const groupOrderId = urlParams.get('group-order')
    
    if (groupOrderId) {
      // Load group order data
      setIsGroupOrderMode(true)
      setGroupOrderId(groupOrderId)
      loadGroupOrderData(groupOrderId)
    } else {
      // Load regular cart data from localStorage
      const savedCart = localStorage.getItem('yolk-cart')
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
      
      // Load order details from localStorage
      const savedVenue = localStorage.getItem('yolk-venue')
      const savedTime = localStorage.getItem('yolk-time')
      const savedDeliveryType = localStorage.getItem('yolk-delivery-type')
      const savedDeliveryAddress = localStorage.getItem('yolk-delivery-address')
      
      if (savedVenue) setSelectedVenue(savedVenue)
      if (savedTime) setSelectedTime(savedTime)
      if (savedDeliveryType) setDeliveryType(savedDeliveryType as "delivery" | "collection")
      if (savedDeliveryAddress) setDeliveryAddress(savedDeliveryAddress)
    }
  }, [])

  const loadGroupOrderData = async (orderId: string) => {
    try {
      const { data: groupOrderData, error: groupOrderError } = await supabase
        .from('group_orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (groupOrderError) {
        console.error('Error fetching group order:', groupOrderError)
        return
      }

      setCurrentGroupOrder(groupOrderData)
      setSelectedVenue(groupOrderData.venue || "")
      setSelectedTime(groupOrderData.time || "")
      setDeliveryType(groupOrderData.delivery_type || "collection")
      setDeliveryAddress(groupOrderData.delivery_address || "")
      setIndividualBudget(groupOrderData.budget?.toString() || "25")
      setTeamSize(groupOrderData.team_size?.toString() || "10")

      // Load group order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('group_order_items')
        .select('*')
        .eq('group_order_id', orderId)
        .order('created_at', { ascending: true })

      if (itemsError) {
        console.error('Error fetching group order items:', itemsError)
        return
      }

      // Transform items to match our local format
      const transformedOrders = transformSupabaseItemsToLocalFormat(itemsData)
      setGroupOrders(transformedOrders)
    } catch (error) {
      console.error('Error loading group order data:', error)
    }
  }

  const transformSupabaseItemsToLocalFormat = (items: RealtimeGroupOrderItem[]): LocalGroupOrder[] => {
    const ordersMap = new Map<string, {
      id: string
      personName: string
      items: CartItem[]
      totalSpent: number
      timestamp: Date
    }>()

    items.forEach(item => {
      if (!ordersMap.has(item.person_name)) {
        ordersMap.set(item.person_name, {
          id: item.id,
          personName: item.person_name,
          items: [],
          totalSpent: 0,
          timestamp: new Date(item.created_at)
        })
      }

      const order = ordersMap.get(item.person_name)!
      const existingItem = order.items.find(cartItem => cartItem.id === item.product_id)
      
      if (existingItem) {
        existingItem.quantity += item.quantity
      } else {
        order.items.push({
          id: item.product_id,
          name: item.product_name,
          description: item.product_description,
          price: item.product_price,
          category: item.product_category,
          image: item.product_image,
          quantity: item.quantity
        })
      }
      
      order.totalSpent = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })

    return Array.from(ordersMap.values())
  }

  const updateQuantity = (id: string, change: number) => {
    if (isGroupOrderMode) {
      // Update team member's order
      setGroupOrders(prev => {
        const updatedOrders = prev.map(order => {
          if (order.personName === "You") {
            const updatedItems = order.items.map(item => {
              if (item.id === id) {
                const newQuantity = Math.max(0, item.quantity + change)
                return newQuantity === 0 ? null : { ...item, quantity: newQuantity }
              }
              return item
            }).filter((item): item is CartItem => item !== null)
            
            return {
              ...order,
              items: updatedItems,
              totalSpent: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            }
          }
          return order
        })
        return updatedOrders
      })
    } else {
      // Update standard cart
      setCart((prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              const newQuantity = Math.max(0, item.quantity + change)
              return newQuantity === 0 ? null : { ...item, quantity: newQuantity }
            }
            return item
          })
          .filter((item): item is CartItem => item !== null),
      )
    }
  }

  const getTotalPrice = () => {
    if (isGroupOrderMode) {
      const userOrder = groupOrders.find(order => order.personName === "You")
      return userOrder?.totalSpent || 0
    }
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    if (isGroupOrderMode) {
      const userOrder = groupOrders.find(order => order.personName === "You")
      return userOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
    }
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const completeOrder = async () => {
    // If this is a group order, update the payment method and status
    if (isGroupOrderMode && groupOrderId) {
      try {
        const { error } = await supabase
          .from('group_orders')
          .update({ 
            payment_method: paymentMethod,
            status: 'finalized',
            updated_at: new Date().toISOString()
          })
          .eq('id', groupOrderId)
          .eq('created_by', user?.id)

        if (error) {
          console.error('Error updating group order payment:', error)
        } else {
          console.log('Group order payment updated successfully')
          // Update local state
          setCurrentGroupOrder(prev => prev ? { 
            ...prev, 
            payment_method: paymentMethod,
            status: 'finalized' 
          } : null)
        }
      } catch (error) {
        console.error('Error updating group order payment:', error)
      }
    }

    setShowOrderComplete(true)
    setTimeout(() => {
      setShowOrderComplete(false)
      // Navigate back to orders page
      window.location.href = '/orders'
    }, 4000)
  }

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f8f68f] mx-auto"></div>
          <p className="text-[#f8f68f] text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
            LOADING YOLK...
          </p>
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
                  className="text-black hover:text-gray-700 font-medium" 
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
          </div>
        </div>
      </nav>

      {/* Order Complete Animation */}
      <Dialog open={showOrderComplete} onOpenChange={setShowOrderComplete}>
        <DialogContent className="max-w-2xl bg-black/90 border-zinc-800 text-white [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-white uppercase text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              Order Complete!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-[#f8f68f] mx-auto" />
            <p className="text-white text-lg">
              Your order has been successfully placed and payment processed.
            </p>
            <p className="text-gray-400">
              You will receive a confirmation email shortly.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Application Modal */}
      <Dialog open={showInvoiceApplication} onOpenChange={setShowInvoiceApplication}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-white uppercase text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              Apply for Invoice Terms
            </DialogTitle>
            <CardDescription className="text-gray-400 text-center">
              Get approved for 30-day payment terms
            </CardDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-white">
                  Company name
                </Label>
                <Input
                  id="company-name"
                  placeholder="Your Company Ltd."
                  className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-reg" className="text-white">
                  Company registration number
                </Label>
                <Input
                  id="company-reg"
                  placeholder="12345678"
                  className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="text-white">
                  Contact person
                </Label>
                <Input
                  id="contact-name"
                  placeholder="John Smith"
                  className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-white">
                  Business email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="john@company.com"
                  className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-spend" className="text-white">
                Expected monthly spend
              </Label>
              <Select>
                <SelectTrigger className="bg-black/50 border-zinc-700 text-white">
                  <SelectValue placeholder="Select expected spend" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="1000-5000">£1,000 - £5,000</SelectItem>
                  <SelectItem value="5000-10000">£5,000 - £10,000</SelectItem>
                  <SelectItem value="10000-25000">£10,000 - £25,000</SelectItem>
                  <SelectItem value="25000+">£25,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-frequency" className="text-white">
                Order frequency
              </Label>
              <Select>
                <SelectTrigger className="bg-black/50 border-zinc-700 text-white">
                  <SelectValue placeholder="Select order frequency" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-[#f8f68f]/10 border-[#f8f68f]/30 rounded p-4">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-[#f8f68f] mt-0.5" />
                <div>
                  <h4 className="text-white font-medium mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    Invoice Terms
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 30-day payment terms</li>
                    <li>• Monthly invoicing</li>
                    <li>• Credit limit based on business size</li>
                    <li>• Fast approval for established businesses</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-zinc-800">
              <Button
                onClick={() => setShowInvoiceApplication(false)}
                variant="outline"
                className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 uppercase text-lg"
                style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Simulate approval process
                  setIsInvoiceApproved(true)
                  setPaymentMethod("invoice")
                  setShowInvoiceApplication(false)
                }}
                className="flex-1 bg-[#f8f68f] text-black hover:bg-[#e6e346] uppercase font-medium text-lg"
                style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
              >
                Submit Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-6 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-14">
          <h1 className="text-4xl font-light text-black uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
            Order Summary
          </h1>
          <Button
            onClick={() => {
              if (isGroupOrderMode) {
                window.location.href = '/orders'
              } else {
                window.location.href = '/'
              }
            }}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-700 uppercase text-xl"
            style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {isGroupOrderMode ? 'Orders' : 'Menu'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {(() => {
              if (isGroupOrderMode) {
                const userOrder = groupOrders.find(order => order.personName === "You")
                return userOrder && userOrder.items.length > 0 ? (
                  userOrder.items.map((item) => (
                    <Card key={item.id} className="bg-zinc-100/50 border-zinc-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-2xl font-medium text-black" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>{item.name}</h3>
                            <p className="text-zinc-600 text-sm">{item.description}</p>
                            <p className="text-black text-xl font-medium mt-2">£{item.price}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => updateQuantity(item.id, -1)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-300 text-black hover:bg-zinc-200"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-black font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              onClick={() => updateQuantity(item.id, 1)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-300 text-black hover:bg-zinc-200"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-zinc-100/50 border-zinc-200 p-8 text-center">
                    <div className="space-y-4 pt-12 pb-12">
                      <p className="text-zinc-500 text-md">Your cart is empty. 💔</p>
                    </div>
                  </Card>
                )
              } else {
                return cart.length === 0 ? (
                  <Card className="bg-zinc-100/50 border-zinc-200 p-8 text-center">
                    <div className="space-y-4 pt-12 pb-12">
                      <p className="text-zinc-500 text-md">Your cart is empty. 💔</p>
                    </div>
                  </Card>
                ) : (
                  cart.map((item) => (
                    <Card key={item.id} className="bg-zinc-100/50 border-zinc-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-2xl font-medium text-black" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>{item.name}</h3>
                            <p className="text-zinc-600 text-sm">{item.description}</p>
                            <p className="text-black text-xl font-medium mt-2">£{item.price}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => updateQuantity(item.id, -1)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-300 text-black hover:bg-zinc-200"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-black font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              onClick={() => updateQuantity(item.id, 1)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-300 text-black hover:bg-zinc-200"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )
              }
            })()}
          </div>

          <div className="space-y-6">
            <Card className="bg-zinc-100/50 border-zinc-200">
              <CardHeader>
                <CardTitle className="text-black uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pickup Location */}
                <div className="space-y-2">
                  <Label className="text-zinc-600 flex items-center text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    {deliveryType === "delivery" ? "Delivery from" : "Pickup Location"}
                  </Label>
                  <div className="bg-white/30 border border-zinc-200 rounded p-3">
                    <p className="text-zinc-800 font-medium">
                      {venues.find(v => v.id === selectedVenue)?.name}
                    </p>
                    <p className="text-zinc-600 text-sm">
                      {venues.find(v => v.id === selectedVenue)?.address}
                    </p>
                  </div>
                </div>
                
                {/* Pickup Time */}
                <div className="space-y-2">
                  <Label className="text-black flex items-center text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    {deliveryType === "delivery" ? "Delivery Time" : "Pickup Time"}
                  </Label>
                  <div className="bg-white/30 border border-zinc-200 rounded p-3">
                    <p className="text-black font-medium">
                      {new Date(selectedTime).toLocaleDateString('en-GB', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-zinc-600 text-sm">
                      {new Date(selectedTime).toLocaleTimeString('en-GB', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card className="bg-zinc-100/50 border-zinc-200">
              <CardHeader>
                <CardTitle className="text-black uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      paymentMethod === "card"
                        ? 'bg-zinc-300 border-zinc-400' 
                        : 'bg-white/30 border-zinc-200 hover:border-zinc-400'
                    }`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <CardContent className="p-4 text-center">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-black" />
                      <h3 className="text-black font-medium text-lg uppercase mb-1" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                        Card Payment
                      </h3>
                      <p className="text-zinc-700 text-xs">Pay now with card</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      paymentMethod === "invoice"
                        ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                        : 'bg-white/30 border-zinc-200 hover:border-zinc-400'
                    }`}
                    onClick={() => {
                      if (!isInvoiceApproved) {
                        setShowInvoiceApplication(true)
                      } else {
                        setPaymentMethod("invoice")
                      }
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-black" />
                      <h3 className="text-black font-medium text-lg uppercase mb-1" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                        Invoice
                      </h3>
                      <p className="text-zinc-600 text-xs">
                        {isInvoiceApproved ? "Approved - Pay later" : "Apply for invoice terms"}
                      </p>
                      {isInvoiceApproved && (
                        <Badge className="mt-2 bg-green-500 text-white text-xs">APPROVED</Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {paymentMethod === "invoice" && isInvoiceApproved && (
                  <div className="bg-[#f8f68f]/10 border-[#f8f68f]/30 rounded p-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-black" />
                      <p className="text-black text-sm">
                        Invoice terms approved. Payment due within 30 days.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-100/50 border-zinc-200">
              <CardHeader>
                <CardTitle className="text-black uppercase text-2xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-800">
                    <span>Subtotal</span>
                    <span>£{getTotalPrice()}</span>
                  </div>
                </div>
                <Button
                  onClick={completeOrder}
                  className="w-full mt-6 bg-[#f8f68f] text-black hover:bg-[#e6e346] font-medium uppercase shadow-lg text-xl"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif', letterSpacing: '0.02em' }}
                  disabled={!selectedVenue || !selectedTime || getTotalItems() === 0 || (paymentMethod === "invoice" && !isInvoiceApproved)}
                >
                  {!selectedVenue || !selectedTime || getTotalItems() === 0 
                    ? "COMPLETE YOUR ORDER" 
                    : paymentMethod === "invoice" && !isInvoiceApproved
                    ? "APPLY FOR INVOICE TERMS"
                    : "YOLK YES! LET'S GO"}
                </Button>
                <p className="text-xs text-zinc-600 mt-2 text-center">
                  {paymentMethod === "card" 
                    ? "Secure payment processing" 
                    : "Pay later, party now - we trust you!"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* YOLK Brand */}
            <div className="space-y-4">
              <img 
                src="/yolk-white.svg" 
                alt="YOLK" 
                className="h-8 w-auto"
              />
              <p className="text-zinc-400 text-sm">
                Fresh, healthy food for busy professionals. 
                Delivered to your office or ready for collection.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-white font-medium uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Quick Links
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Order Food
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Our Locations
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Group Orders
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Corporate Accounts
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-white font-medium uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Support
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Order Tracking
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h3 className="text-white font-medium uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Company
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    About YOLK
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Sustainability
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Press
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-zinc-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-zinc-400 text-sm">
              © 2024 YOLK. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm">
                Terms of Service
              </a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 