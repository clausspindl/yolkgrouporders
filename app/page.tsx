"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Building2, ArrowRight, Plus, Minus, ShoppingCart, CheckCircle, X, MapPin, Truck, CreditCard, FileText, Users, Link, Clock } from "lucide-react"

// Spindl API interfaces
interface SpindlPrice {
  id: string
  currentPrice: number
  price: number
  currency: string
}

interface SpindlName {
  culture: string
  value: string
}

interface SpindlProduct {
  id: string
  name: SpindlName[]
  description: SpindlName[]
  prices: SpindlPrice[]
  photos: string[]
  code: string
  status: string
}

interface SpindlCategory {
  id: string
  name: SpindlName[]
  description: SpindlName[]
  products: SpindlProduct[]
  photo: string
}

interface SpindlMenuResponse {
  venueId: string
  currency: string
  categories: SpindlCategory[]
}

// Local interfaces
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

// Available venues with coordinates for distance calculation
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

// Transform Spindl product to MenuItem
const transformSpindlProduct = (product: SpindlProduct, categoryName: string): MenuItem => {
  console.log('Transforming product:', {
    id: product.id,
    nameArray: product.name,
    descriptionArray: product.description,
    pricesArray: product.prices,
    photos: product.photos
  })
  
  const name = product.name.find(n => n.culture === 'en') || product.name[0] || { value: 'Unnamed Product' }
  const description = product.description.find(d => d.culture === 'en') || product.description[0] || { value: '' }
  const price = product.prices[0] || { currentPrice: 0 }
  const image = product.photos[0] || "/placeholder.svg?height=200&width=300"

  console.log('Transformation result:', {
    selectedName: name,
    selectedDescription: description,
    selectedPrice: price,
    selectedImage: image
  })

  return {
    id: product.id,
    name: name.value,
    description: description.value,
    price: price.currentPrice,
    category: categoryName,
    image: image,
  }
}

// Fetch menu from Spindl API
const fetchSpindlMenu = async (): Promise<MenuItem[]> => {
  try {
    console.log('Fetching menu from Spindl API...')
    
    const apiUrl = 'https://staging-pos-api.spindl.app/partner/menu/current'
    console.log('Making request to:', apiUrl)
    
    // Try different approaches: headers and query parameters
    const venueId = '59ff2077-55a0-45a5-e47f-08da801fcebd'
    const approaches = [
      { type: 'header', key: 'venueId', value: venueId },
      { type: 'header', key: 'X-Venue-ID', value: venueId },
      { type: 'header', key: 'venue-id', value: venueId },
      { type: 'query', key: 'venueId', value: venueId },
      { type: 'query', key: 'venue_id', value: venueId },
    ]

    let response: Response | null = null
    let lastError: string = ''

    for (const [index, approach] of approaches.entries()) {
      try {
        console.log(`Trying approach ${index + 1}:`, approach)
        
        let requestUrl = apiUrl
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
        
        if (approach.type === 'header') {
          headers[approach.key] = approach.value
        } else if (approach.type === 'query') {
          const url = new URL(apiUrl)
          url.searchParams.set(approach.key, approach.value)
          requestUrl = url.toString()
        }
        
        response = await fetch(requestUrl, {
          method: 'GET',
          headers,
        })

        console.log(`Response ${index + 1} status:`, response.status)
        console.log(`Response ${index + 1} headers:`, Object.fromEntries(response.headers.entries()))

        // If we get 204 (No Content), that's a successful response but with no data
        if (response.status === 204) {
          console.log('API returned 204 No Content - venue might have no menu items')
          throw new Error('No menu items available for this venue')
        }

        if (response.ok) {
          // Clone response so we can read it multiple times if needed
          const responseClone = response.clone()
          const responseText = await responseClone.text()
          console.log(`Response ${index + 1} body length:`, responseText.length)
          
          if (responseText.trim()) {
            console.log('Raw response:', responseText.substring(0, 500) + '...')
            break // Success! Exit the loop
          } else {
            lastError = 'Empty response body'
            continue
          }
        } else {
          const responseClone = response.clone()
          const errorText = await responseClone.text()
          lastError = `HTTP ${response.status}: ${errorText}`
          console.error(`Attempt ${index + 1} failed:`, lastError)
          continue
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.error(`Attempt ${index + 1} error:`, lastError)
        continue
      }
    }

    if (!response || !response.ok) {
      throw new Error(`All attempts failed. Last error: ${lastError}`)
    }

    // Read the successful response
    const responseText = await response.text()
    if (!responseText.trim()) {
      throw new Error('Empty response from API')
    }

    console.log('Final successful response text length:', responseText.length)
    const data: SpindlMenuResponse = JSON.parse(responseText)
    console.log('Parsed API data:', {
      venueId: data.venueId,
      currency: data.currency,
      categoriesCount: data.categories.length,
      categories: data.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        productsCount: cat.products.length,
        products: cat.products.map(prod => ({
          id: prod.id,
          name: prod.name,
          status: prod.status,
          prices: prod.prices
        }))
      }))
    })
    
    // Transform categories and products into MenuItem format
    const menuItems: MenuItem[] = []
    
    data.categories.forEach(category => {
      const categoryName = category.name.find(n => n.culture === 'en')?.value || 
                          category.name[0]?.value || 
                          'Uncategorized'
      
      console.log(`Processing category: ${categoryName}, products: ${category.products.length}`)
      
      category.products.forEach(product => {
        console.log(`Product ${product.id} status: "${product.status}"`)
        
        // More flexible status checking - include more possible status values
        const validStatuses = ['active', 'available', 'enabled', 'published', 'visible', 'public', 'true', '1']
        const status = (product.status || '').toLowerCase().trim()
        
        if (validStatuses.includes(status) || !product.status) {
          const transformedItem = transformSpindlProduct(product, categoryName)
          console.log('Transformed product:', transformedItem)
          menuItems.push(transformedItem)
        } else {
          console.log(`Skipping product ${product.id} with status: "${product.status}"`)
        }
      })
    })

    console.log(`Final menu items count: ${menuItems.length}`)
    return menuItems
  } catch (error) {
    console.error('Error fetching Spindl menu:', error)
    // Return fallback menu items
    return [
      {
        id: "1",
        name: "Executive Breakfast Platter",
        description: "Premium selection of pastries, fresh fruits, artisanal coffee service",
        price: 28,
        category: "Breakfast",
        image: "/placeholder.svg?height=200&width=300",
      },
      {
        id: "2",
        name: "Corporate Lunch Box",
        description: "Gourmet sandwich, seasonal salad, premium sides, dessert",
        price: 35,
        category: "Lunch",
        image: "/placeholder.svg?height=200&width=300",
      },
      {
        id: "3",
        name: "Team Building Brunch",
        description: "Interactive brunch experience with live cooking stations",
        price: 45,
        category: "Brunch",
        image: "/placeholder.svg?height=200&width=300",
      },
      {
        id: "4",
        name: "Executive Dinner Experience",
        description: "Multi-course fine dining with wine pairing options",
        price: 85,
        category: "Dinner",
        image: "/placeholder.svg?height=200&width=300",
      },
    ]
  }
}

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  return distance
}

// Find closest venue to given coordinates
const findClosestVenue = (lat: number, lng: number) => {
  let closestVenue = venues[0]
  let minDistance = calculateDistance(lat, lng, venues[0].lat, venues[0].lng)
  
  venues.forEach(venue => {
    const distance = calculateDistance(lat, lng, venue.lat, venue.lng)
    if (distance < minDistance) {
      minDistance = distance
      closestVenue = venue
    }
  })
  
  return { venue: closestVenue, distance: minDistance }
}

// Simulate geocoding (in real app, use Google Maps Geocoding API)
const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  // This is a mock function - in real implementation, you'd use Google Maps Geocoding API
  // For demo purposes, return coordinates for London center
  if (address.trim()) {
    return { lat: 51.5074, lng: -0.1278 }
  }
  return null
}



export default function YolkBusinessPortal() {
  const [currentView, setCurrentView] = useState("hero")
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderDate, setOrderDate] = useState("")
  const [guestCount, setGuestCount] = useState("")
  const [selectedVenue, setSelectedVenue] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedHour, setSelectedHour] = useState("")
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const minDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    return minDate.getMonth()
  })
  const [calendarYear, setCalendarYear] = useState(() => {
    const minDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    return minDate.getFullYear()
  })
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(false)
  const [previousView, setPreviousView] = useState("")
  const [showYolkYes, setShowYolkYes] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [modalQuantity, setModalQuantity] = useState(1)
  const [showOrderComplete, setShowOrderComplete] = useState(false)

  // New state for multi-step order flow
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderStep, setOrderStep] = useState(1)
  const [deliveryType, setDeliveryType] = useState<"delivery" | "collection" | "">("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false)
  const [suggestedVenue, setSuggestedVenue] = useState<typeof venues[0] | null>(null)

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"card" | "invoice">("card")
  const [showInvoiceApplication, setShowInvoiceApplication] = useState(false)
  const [isInvoiceApproved, setIsInvoiceApproved] = useState(false)

  // Individual choice group order state
  const [orderType, setOrderType] = useState<"standard" | "individual-choice" | "">("")
  const [individualBudget, setIndividualBudget] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [orderDeadline, setOrderDeadline] = useState("")
  const [groupOrderId, setGroupOrderId] = useState("")
  const [groupOrderUrl, setGroupOrderUrl] = useState("")
  const [showGroupOrderDashboard, setShowGroupOrderDashboard] = useState(false)
  const [groupOrders, setGroupOrders] = useState<Array<{
    id: string
    personName: string
    items: CartItem[]
    totalSpent: number
    timestamp: Date
  }>>([])
  const [isGroupOrderMode, setIsGroupOrderMode] = useState(false)

  // Combine date and time into selectedTime when both are available
  useEffect(() => {
    if (selectedDate && selectedHour) {
      setSelectedTime(`${selectedDate}T${selectedHour}`)
    } else {
      setSelectedTime("")
    }
  }, [selectedDate, selectedHour])

  // Track previous view and scroll to top when transitioning from setup to menu
  useEffect(() => {
    if (previousView === "setup" && currentView === "menu") {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setPreviousView(currentView)
  }, [currentView, previousView])

  // Load menu data on component mount
  useEffect(() => {
    const loadMenu = async () => {
      setIsLoadingMenu(true)
      try {
        const items = await fetchSpindlMenu()
        setMenuItems(items)
      } catch (error) {
        console.error('Failed to load menu:', error)
      } finally {
        setIsLoadingMenu(false)
      }
    }

    loadMenu()
  }, [])

  // Simulate real-time group order updates
  useEffect(() => {
    if (showGroupOrderDashboard && groupOrders.length === 0) {
      // Simulate team members adding orders
      const demoOrders = [
        {
          id: "1",
          personName: "Sarah Johnson",
          items: [
            { id: "1", name: "Executive Breakfast Platter", description: "Premium selection of pastries, fresh fruits, artisanal coffee service", price: 28, category: "Breakfast", image: "/placeholder.svg?height=200&width=300", quantity: 1 }
          ],
          totalSpent: 28,
          timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        },
        {
          id: "2",
          personName: "Mike Chen",
          items: [
            { id: "2", name: "Corporate Lunch Box", description: "Gourmet sandwich, seasonal salad, premium sides, dessert", price: 35, category: "Lunch", image: "/placeholder.svg?height=200&width=300", quantity: 1 },
            { id: "3", name: "Team Building Brunch", description: "Interactive brunch experience with live cooking stations", price: 45, category: "Brunch", image: "/placeholder.svg?height=200&width=300", quantity: 1 }
          ],
          totalSpent: 80,
          timestamp: new Date(Date.now() - 3 * 60 * 1000) // 3 minutes ago
        },
        {
          id: "3",
          personName: "Emma Davis",
          items: [
            { id: "4", name: "Executive Dinner Experience", description: "Multi-course fine dining with wine pairing options", price: 85, category: "Dinner", image: "/placeholder.svg?height=200&width=300", quantity: 1 }
          ],
          totalSpent: 85,
          timestamp: new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
        }
      ]

      // Add demo orders with delays to simulate real-time updates
      demoOrders.forEach((order, index) => {
        setTimeout(() => {
          setGroupOrders(prev => [...prev, order])
        }, (index + 1) * 2000) // Add each order 2 seconds apart
      })
    }
  }, [showGroupOrderDashboard, groupOrders.length])

  const addToCart = (item: MenuItem) => {
    if (isGroupOrderMode) {
      // Add to group order instead of regular cart
      const newOrder = {
        id: Date.now().toString(),
        personName: "You",
        items: [{ ...item, quantity: 1 }],
        totalSpent: item.price,
        timestamp: new Date()
      }
      setGroupOrders(prev => [...prev, newOrder])
      
      // Show YOLK YES! animation
      setShowYolkYes(true)
      setTimeout(() => setShowYolkYes(false), 2000)
    } else {
      setCart((prev) => {
        const existing = prev.find((cartItem) => cartItem.id === item.id)
        if (existing) {
          return prev.map((cartItem) =>
            cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
          )
        }
        return [...prev, { ...item, quantity: 1 }]
      })
      
      // Show YOLK YES! animation
      setShowYolkYes(true)
      setTimeout(() => setShowYolkYes(false), 2000)
    }
  }

  const updateQuantity = (id: string, change: number) => {
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

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const openProductModal = (product: MenuItem) => {
    setSelectedProduct(product)
    setModalQuantity(1)
    setProductModalOpen(true)
  }

  const closeProductModal = () => {
    setProductModalOpen(false)
    setSelectedProduct(null)
    setModalQuantity(1)
  }

  const addToCartFromModal = () => {
    if (selectedProduct) {
      for (let i = 0; i < modalQuantity; i++) {
        addToCart(selectedProduct)
      }
      closeProductModal()
    }
  }

  const completeOrder = () => {
    setShowOrderComplete(true)
    setTimeout(() => {
      setShowOrderComplete(false)
      setCurrentView("hero")
      setCart([])
      // Reset payment method to default
      setPaymentMethod("card")
    }, 4000)
  }

  // Handle address input and find closest venue
  const handleAddressSubmit = async () => {
    if (!deliveryAddress.trim()) return
    
    setIsGeocodingAddress(true)
    try {
      const coordinates = await geocodeAddress(deliveryAddress)
      if (coordinates) {
        const { venue, distance } = findClosestVenue(coordinates.lat, coordinates.lng)
        setSuggestedVenue(venue)
        setSelectedVenue(venue.id)
      }
    } catch (error) {
      console.error('Error geocoding address:', error)
    } finally {
      setIsGeocodingAddress(false)
    }
  }

  // Reset order modal state
  const resetOrderModal = () => {
    setOrderStep(1)
    setDeliveryType("")
    setDeliveryAddress("")
    setSelectedVenue("")
    setSelectedDate("")
    setSelectedHour("")
    setSuggestedVenue(null)
    setOrderType("")
    setIndividualBudget("")
    setTeamSize("")
    setOrderDeadline("")
    setIsGroupOrderMode(false)
  }

  // Open order modal
  const startOrderFlow = () => {
    resetOrderModal()
    setOrderModalOpen(true)
  }

  // Close order modal
  const closeOrderModal = () => {
    setOrderModalOpen(false)
    resetOrderModal()
  }

  // Handle order flow navigation
  const nextOrderStep = () => {
    if (orderStep === 1 && deliveryType) {
      setOrderStep(2)
    } else if (orderStep === 2) {
      if (deliveryType === "delivery" && suggestedVenue) {
        setOrderStep(3)
      } else if (deliveryType === "collection" && selectedVenue) {
        setOrderStep(3)
      }
    } else if (orderStep === 3 && selectedDate && selectedHour) {
      setOrderStep(4)
    } else if (orderStep === 4) {
      if (orderType === "standard") {
        // Complete the order setup for standard order
        setOrderModalOpen(false)
        setCurrentView("menu")
      } else if (orderType === "individual-choice" && individualBudget && teamSize) {
        // Generate group order and show dashboard
        const orderId = generateGroupOrderId()
        const url = generateGroupOrderUrl(orderId)
        setGroupOrderId(orderId)
        setGroupOrderUrl(url)
        setOrderModalOpen(false)
        setShowGroupOrderDashboard(true)
      }
    }
  }

  const prevOrderStep = () => {
    if (orderStep > 1) {
      setOrderStep(orderStep - 1)
    }
  }

  // Helper functions for group orders
  const generateGroupOrderId = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const generateGroupOrderUrl = (orderId: string): string => {
    const baseUrl = window.location.origin
    return `${baseUrl}?group-order=${orderId}`
  }

  const getTotalGroupSpending = (orders: typeof groupOrders) => {
    return orders.reduce((total, order) => total + order.totalSpent, 0)
  }

  const getRemainingGroupBudget = (budget: number, teamSize: number) => {
    const totalBudget = budget * Number(teamSize)
    const spent = getTotalGroupSpending(groupOrders)
    return Math.max(0, totalBudget - spent)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* YOLK YES! Animation - centered on screen */}
      <AnimatePresence>
        {showYolkYes && (
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0, y: 20 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
            exit={{ scale: 0, rotate: 180, opacity: 0, y: -20 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
            className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
          >
            <img 
              src="/yolk-yes.png" 
              alt="YOLK YES!" 
              className="w-[220px] h-[220px] drop-shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Complete Animation */}
      <AnimatePresence>
        {showOrderComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] backdrop-blur-sm"
          >
            <div className="text-center space-y-8">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="space-y-4"
              >
                <motion.h1 
                  className="text-[120px] text-[#f8f68f] leading-relaxed"
                  style={{ 
                    fontFamily: 'Hipnouma, serif',
                    letterSpacing: '0.01em'
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  We've got your order!
                </motion.h1>
              </motion.div>
              
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="space-y-2"
              >
                <p 
                  className="text-white text-xl uppercase tracking-wider"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif', letterSpacing: '0.1em' }}
                >
                  Order confirmed for {venues.find(v => v.id === selectedVenue)?.name}
                </p>
                <p className="text-gray-400">
                  {deliveryType === "delivery" ? "Delivery" : "Collection"} on{" "}
                  {new Date(selectedTime).toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
                <p className="text-gray-400">
                  Payment: {paymentMethod === "card" ? "Card payment" : "Invoice (30 days)"}
                </p>
              </motion.div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

            <div className="space-y-2">
              <Label htmlFor="additional-info" className="text-white">
                Additional information
              </Label>
              <Textarea
                id="additional-info"
                placeholder="Tell us about your business, typical order sizes, special requirements..."
                className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500 min-h-[100px]"
              />
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

      {/* Group Order Dashboard Modal */}
      <Dialog open={showGroupOrderDashboard} onOpenChange={setShowGroupOrderDashboard}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white [&>button]:hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-white uppercase text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              Group Order Dashboard
            </DialogTitle>
            <CardDescription className="text-gray-400 text-center">
              Share the link below with your team
            </CardDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Shareable Link Section */}
            <Card className="bg-[#f8f68f]/10 border-[#f8f68f]/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Link className="h-5 w-5 text-[#f8f68f]" />
                  <span className="text-white font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    Shareable Link
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    value={groupOrderUrl}
                    readOnly
                    className="bg-black/50 border-zinc-700 text-white flex-1"
                  />
                  <Button
                    onClick={() => copyToClipboard(groupOrderUrl)}
                    className="bg-[#f8f68f] text-black hover:bg-[#e6e346]"
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-[#f8f68f]" />
                  <p className="text-gray-400 text-sm">Team Size</p>
                  <p className="text-white font-bold text-xl">{teamSize}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-[#f8f68f]" />
                  <p className="text-gray-400 text-sm">Budget per Person</p>
                  <p className="text-white font-bold text-xl">£{individualBudget}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 text-center">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-[#f8f68f]" />
                  <p className="text-gray-400 text-sm">Total Budget</p>
                  <p className="text-white font-bold text-xl">£{Number(individualBudget) * Number(teamSize)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Group Order Cart */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    Group Order Cart
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setIsGroupOrderMode(true)
                      setShowGroupOrderDashboard(false)
                      setCurrentView("menu")
                    }}
                    className="bg-[#f8f68f] text-black hover:bg-[#e6e346] uppercase text-sm"
                    style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Items
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {groupOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">No items in group order yet.</p>
                    <p className="text-gray-400 text-sm mt-2">Share the link with your team or add items yourself!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Combine all items from group orders */}
                    {(() => {
                      const allItems: { [key: string]: CartItem } = {}
                      groupOrders.forEach(order => {
                        order.items.forEach(item => {
                          if (allItems[item.id]) {
                            allItems[item.id].quantity += item.quantity
                          } else {
                            allItems[item.id] = { ...item }
                          }
                        })
                      })
                      return Object.values(allItems).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-black/30 border border-zinc-600 rounded">
                          <div className="flex-1">
                            <h3 className="text-white font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              {item.name}
                            </h3>
                            <p className="text-gray-400 text-sm">{item.description}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-white font-medium">£{item.price}</span>
                            <span className="text-gray-400">x{item.quantity}</span>
                            <span className="text-white font-bold">£{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Overview */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  Budget Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Budget:</span>
                    <span className="text-white font-medium">£{Number(individualBudget) * Number(teamSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Spent:</span>
                    <span className="text-white font-medium">£{getTotalGroupSpending(groupOrders)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-600 pt-2">
                    <span className="text-gray-400">Remaining:</span>
                    <span className={`font-medium ${getRemainingGroupBudget(Number(individualBudget), Number(teamSize)) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      £{getRemainingGroupBudget(Number(individualBudget), Number(teamSize))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-zinc-800">
              <Button
                onClick={() => setShowGroupOrderDashboard(false)}
                variant="outline"
                className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 uppercase text-lg"
                style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
              >
                Close Dashboard
              </Button>
              <Button
                onClick={() => {
                  // Finalize the group order
                  setShowGroupOrderDashboard(false)
                  setCurrentView("cart")
                  // Add all group orders to cart
                  const allItems: CartItem[] = []
                  groupOrders.forEach(order => {
                    order.items.forEach(item => {
                      const existing = allItems.find(cartItem => cartItem.id === item.id)
                      if (existing) {
                        existing.quantity += item.quantity
                      } else {
                        allItems.push({ ...item })
                      }
                    })
                  })
                  setCart(allItems)
                }}
                disabled={groupOrders.length === 0}
                className="flex-1 bg-[#f8f68f] text-black hover:bg-[#e6e346] uppercase font-medium text-lg"
                style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
              >
                Finalize Order ({getTotalGroupSpending(groupOrders) > 0 ? `${groupOrders.length} people` : 'Empty'})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Setup Modal */}
      <Dialog open={orderModalOpen} onOpenChange={closeOrderModal}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-white uppercase text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              {orderStep === 1 && "How would you like your order?"}
              {orderStep === 2 && deliveryType === "delivery" && "Enter your delivery address"}
              {orderStep === 2 && deliveryType === "collection" && "Choose your collection point"}
              {orderStep === 3 && "When would you like it?"}
              {orderStep === 4 && "What type of order?"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-6">
            {/* Step 1: Delivery Type Selection */}
            {orderStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      deliveryType === "delivery"
                        ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                        : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => setDeliveryType("delivery")}
                  >
                    <CardContent className="p-6 text-center">
                      <Truck className="h-12 w-12 mx-auto mb-4 text-[#f8f68f]" />
                      <h3 className="text-white font-medium text-xl uppercase mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                        Delivered Catering
                      </h3>
                      <p className="text-gray-400 text-sm">We'll bring the goods to you</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      deliveryType === "collection"
                        ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                        : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => setDeliveryType("collection")}
                  >
                    <CardContent className="p-6 text-center">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-[#f8f68f]" />
                      <h3 className="text-white font-medium text-xl uppercase mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                        Click & Collect
                      </h3>
                      <p className="text-gray-400 text-sm">Pick up from your chosen YOLK</p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Step 2A: Address Input for Delivery */}
            {orderStep === 2 && deliveryType === "delivery" && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <Label className="text-white text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    <MapPin className="inline h-5 w-5 mr-2" />
                    Delivery Address
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter your delivery address..."
                      className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500 flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddressSubmit()}
                    />
                    <Button
                      onClick={handleAddressSubmit}
                      disabled={!deliveryAddress.trim() || isGeocodingAddress}
                      className="bg-[#f8f68f] text-black hover:bg-[#e6e346]"
                    >
                      {isGeocodingAddress ? "Finding..." : "Find YOLK"}
                    </Button>
                  </div>
                  
                  {suggestedVenue && (
                    <Card className="bg-[#f8f68f]/10 border-[#f8f68f]/30">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-[#f8f68f]" />
                          <div>
                            <p className="text-white font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              Closest YOLK: {suggestedVenue.name}
                            </p>
                            <p className="text-gray-400 text-sm">{suggestedVenue.address}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2B: Venue Selection for Collection */}
            {orderStep === 2 && deliveryType === "collection" && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <Label className="text-white text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  <Building2 className="inline h-5 w-5 mr-2" />
                  Choose Collection Point
                </Label>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {venues.map((venue) => (
                    <Card 
                      key={venue.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedVenue === venue.id 
                          ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                          : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
                      }`}
                      onClick={() => setSelectedVenue(venue.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-lg uppercase mb-1" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              {venue.name}
                            </h3>
                            <p className="text-gray-400 text-xs leading-tight">{venue.address}</p>
                          </div>
                          {selectedVenue === venue.id && (
                            <CheckCircle className="h-5 w-5 text-[#f8f68f] ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Time Selection */}
            {orderStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Date Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      Select Date
                    </p>
                    <div className="flex items-center space-x-4 text-xl">
                      <button
                        onClick={() => {
                          if (calendarMonth === 0) {
                            setCalendarMonth(11)
                            setCalendarYear(calendarYear - 1)
                          } else {
                            setCalendarMonth(calendarMonth - 1)
                          }
                        }}
                        disabled={(() => {
                          const today = new Date()
                          const minDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
                          const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1
                          const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear
                          return new Date(prevYear, prevMonth + 1, 0) < minDate
                        })()}
                        className="text-[#f8f68f] hover:text-white transition-colors disabled:text-zinc-600 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      <p className="text-white font-medium min-w-[140px] text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                        {new Date(calendarYear, calendarMonth).toLocaleDateString('en-GB', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <button
                        onClick={() => {
                          if (calendarMonth === 11) {
                            setCalendarMonth(0)
                            setCalendarYear(calendarYear + 1)
                          } else {
                            setCalendarMonth(calendarMonth + 1)
                          }
                        }}
                        className="text-[#f8f68f] hover:text-white transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {/* Calendar header */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-zinc-400 text-sm p-2 font-medium">
                        {day}
                      </div>
                    ))}
                    {/* Calendar days */}
                    {Array.from({ length: 42 }, (_, i) => {
                      const today = new Date()
                      const minDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
                      const startOfMonth = new Date(calendarYear, calendarMonth, 1)
                      const firstDayOfWeek = startOfMonth.getDay()
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
                      
                      const dayNumber = i - firstDayOfWeek + 1
                      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
                      const currentDate = new Date(calendarYear, calendarMonth, dayNumber)
                      const isAvailable = isValidDay && currentDate >= minDate
                      const dateString = currentDate.toISOString().split('T')[0]
                      const isSelected = selectedDate === dateString
                      
                      if (!isValidDay) {
                        return <div key={i} className="p-2"></div>
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => isAvailable ? setSelectedDate(dateString) : null}
                          className={`p-2 text-sm rounded transition-all ${
                            isAvailable
                              ? isSelected
                                ? 'bg-[#f8f68f] text-black font-bold'
                                : 'bg-black/30 text-white hover:bg-[#f8f68f]/20 hover:text-[#f8f68f]'
                              : 'bg-transparent text-zinc-600 cursor-not-allowed'
                          }`}
                          disabled={!isAvailable}
                        >
                          {dayNumber}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-3">
                  <p className="text-white text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    Select Time
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { display: '9:00 AM', value: '09:00' },
                      { display: '10:00 AM', value: '10:00' },
                      { display: '11:00 AM', value: '11:00' },
                      { display: '12:00 PM', value: '12:00' },
                      { display: '1:00 PM', value: '13:00' },
                      { display: '2:00 PM', value: '14:00' },
                      { display: '3:00 PM', value: '15:00' },
                      { display: '4:00 PM', value: '16:00' },
                      { display: '5:00 PM', value: '17:00' },
                      { display: '6:00 PM', value: '18:00' },
                      { display: '7:00 PM', value: '19:00' },
                      { display: '8:00 PM', value: '20:00' }
                    ].map(time => (
                      <button
                        key={time.value}
                        onClick={() => setSelectedHour(time.value)}
                        className={`p-3 text-sm rounded transition-all ${
                          selectedHour === time.value
                            ? 'bg-[#f8f68f] text-black font-bold'
                            : 'bg-black/30 text-white hover:bg-[#f8f68f]/20 hover:text-[#f8f68f]'
                        }`}
                      >
                        {time.display}
                      </button>
                    ))}
                  </div>
                </div>

                                 <p className="text-sm text-gray-400">
                   Orders must be placed at least 3 days in advance
                 </p>
               </motion.div>
             )}

             {/* Step 4: Order Type Selection */}
             {orderStep === 4 && (
               <motion.div
                 initial={{ opacity: 0, x: 50 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="space-y-6"
               >
                 <div className="grid grid-cols-1 gap-4">
                   <Card 
                     className={`cursor-pointer transition-all duration-200 ${
                       orderType === "standard"
                         ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                         : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
                     }`}
                     onClick={() => setOrderType("standard")}
                   >
                     <CardContent className="p-6 text-center">
                       <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-[#f8f68f]" />
                       <h3 className="text-white font-medium text-xl uppercase mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                         Standard Order
                       </h3>
                       <p className="text-gray-400 text-sm">Order items for the whole team</p>
                     </CardContent>
                   </Card>

                   <Card 
                     className={`cursor-pointer transition-all duration-200 ${
                       orderType === "individual-choice"
                         ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                         : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
                     }`}
                     onClick={() => setOrderType("individual-choice")}
                   >
                     <CardContent className="p-6 text-center">
                       <Users className="h-12 w-12 mx-auto mb-4 text-[#f8f68f]" />
                       <h3 className="text-white font-medium text-xl uppercase mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                         Individual Choice
                       </h3>
                       <p className="text-gray-400 text-sm">Let each team member choose their own items</p>
                     </CardContent>
                   </Card>
                 </div>

                 {/* Individual Choice Configuration */}
                 {orderType === "individual-choice" && (
                   <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="space-y-4 p-4 bg-[#f8f68f]/10 border-[#f8f68f]/30 rounded"
                   >
                     <h4 className="text-white font-medium text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                       Configure Individual Choice Order
                     </h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label className="text-white">Budget per person</Label>
                         <Input
                           value={individualBudget}
                           onChange={(e) => setIndividualBudget(e.target.value)}
                           placeholder="£25"
                           className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label className="text-white">Team size</Label>
                         <Input
                           value={teamSize}
                           onChange={(e) => setTeamSize(e.target.value)}
                           placeholder="10"
                           className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                         />
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label className="text-white">Order deadline</Label>
                       <Input
                         value={orderDeadline}
                         onChange={(e) => setOrderDeadline(e.target.value)}
                         placeholder="2 days before pickup"
                         className="bg-black/50 border-zinc-700 text-white placeholder:text-gray-500"
                       />
                     </div>

                     <div className="bg-black/30 border border-zinc-700 rounded p-3">
                       <div className="flex items-center space-x-2 mb-2">
                         <Users className="h-4 w-4 text-[#f8f68f]" />
                         <span className="text-white font-medium">How it works:</span>
                       </div>
                       <ul className="text-gray-300 text-sm space-y-1">
                         <li>• Generate a shareable link for your team</li>
                         <li>• Each person chooses items within their budget</li>
                         <li>• See all orders in real-time dashboard</li>
                         <li>• Finalize when everyone has ordered</li>
                       </ul>
                     </div>
                   </motion.div>
                 )}
               </motion.div>
             )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-6 border-t border-zinc-800">
              {orderStep > 1 && (
                <Button
                  onClick={prevOrderStep}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 uppercase text-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Back
                </Button>
              )}
              
              {orderStep === 1 && (
                <Button
                  onClick={closeOrderModal}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 uppercase text-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Cancel
                </Button>
              )}

              <Button
                onClick={nextOrderStep}
                disabled={
                  (orderStep === 1 && !deliveryType) ||
                  (orderStep === 2 && deliveryType === "delivery" && !suggestedVenue) ||
                  (orderStep === 2 && deliveryType === "collection" && !selectedVenue) ||
                  (orderStep === 3 && (!selectedDate || !selectedHour)) ||
                  (orderStep === 4 && !orderType) ||
                  (orderStep === 4 && orderType === "individual-choice" && (!individualBudget || !teamSize))
                }
                className="flex-1 bg-[#f8f68f] text-black hover:bg-[#e6e346] uppercase font-medium text-lg"
                style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
              >
                {orderStep === 4 ? "Create Order" : "Continue"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: '#F8F68F' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* YOLK Brand */}
              <div className="flex items-center">
                <img 
                  src="/yolk-icon.svg" 
                  alt="YOLK" 
                  className="h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setCurrentView("hero")}
                />
              </div>
              
              {/* Navigation Items */}
              <div className="flex items-center space-x-6 text-xl">
                <button 
                  onClick={startOrderFlow}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  ORDER
                </button>
                <a href="#" className="text-black hover:text-gray-700 font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  LOCATIONS
                </a>
                <button 
                  onClick={() => setCurrentView("menu")}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  MENUS
                </button>
                <a href="#" className="text-black hover:text-gray-700 font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  BREWCLUB
                </a>
              </div>
            </div>
            
            {/* Order Info Display */}
            {selectedVenue && selectedTime && (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={startOrderFlow}
                  className="flex items-center space-x-4 bg-black/10 px-4 py-2 rounded-lg hover:bg-black/20 transition-colors cursor-pointer"
                  title="Click to change order details"
                >
                  <div className="flex items-center space-x-2">
                    {deliveryType === "delivery" ? (
                      <Truck className="h-4 w-4 text-black" />
                    ) : (
                      <Building2 className="h-4 w-4 text-black" />
                    )}
                    <span className="text-black font-medium text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      {venues.find(v => v.id === selectedVenue)?.name}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-black/30"></div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-black" />
                    <span className="text-black font-medium text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      {new Date(selectedTime).toLocaleDateString('en-GB', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short'
                      })} {new Date(selectedTime).toLocaleTimeString('en-GB', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </button>

                {/* Cart Button */}
                {getTotalItems() > 0 && (
                  <Button
                    onClick={() => setCurrentView("cart")}
                    className="bg-black text-[#f8f68f] hover:bg-gray-800 relative shadow-lg font-medium uppercase text-lg px-4 py-2"
                    style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart ({getTotalItems()})
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                      {getTotalItems()}
                    </Badge>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <AnimatePresence mode="wait">
        {currentView === "hero" && (
          <div className="min-h-screen bg-black flex items-center justify-center pt-[10rem]">
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 text-center max-w-4xl mx-auto px-6"
            >
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <div className="relative inline-block">
                  <img 
                    src="/yolk-logo.svg" 
                    alt="YOLK" 
                    className="h-[250px] w-auto mb-6"
                  />
                  <Badge className="absolute -top-8 -right-14 bg-zinc-900 text-white px-3 py-1 text-xs font-medium">
                    BUSINESS
                  </Badge>
                </div>
                <p className="text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed text-sm">
                  Exclusive access for verified business partners. Place large group orders with flexible invoicing and
                  premium service guaranteed.
                </p>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  onClick={() => setCurrentView("apply")}
                  className="bg-[#3250B9] text-[#f8f68f] 
                  px-5 py-6 text-xl font-medium rounded-full transition-all duration-300 uppercase shadow-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Become partner
                </Button>
                <Button
                  onClick={startOrderFlow}
                  variant="outline"
                  className="bg-[#FF6400] text-[#f8f68f] hover:from-[#e6e346] hover:to-[#d4d123] hover:text-white px-5 py-6 text-xl font-medium rounded-full transition-all duration-300 uppercase shadow-lg border-0"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  ORDER NOW
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
              >
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-4 text-[#f8f68f]" />
                  <h3 className="text-2xl font-medium mb-2 text-gray-100 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>PLAN AHEAD, TASTE AMAZING</h3>
                  <p className="text-gray-400 text-sm">3+ days notice for next-level prep</p>
                </div>
                <div className="text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-4 text-[#f8f68f]" />
                  <h3 className="text-2xl font-medium mb-2 text-gray-100 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>EXCLUSIVE ACCESS</h3>
                  <p className="text-gray-400 text-sm">VIP treatment for verified partners</p>
                </div>
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-4 text-[#f8f68f]" />
                  <h3 className="text-2xl font-medium mb-2 text-gray-100 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>PAY LATER, PARTY NOW</h3>
                  <p className="text-gray-400 text-sm">No prepayment needed - we trust you</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}

        {currentView === "apply" && (
          <div className="min-h-screen bg-black flex items-center justify-center pt-20">
            <motion.div
              key="apply"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 flex items-center justify-center p-6"
            >
            <Card className="w-[600px] bg-gray-900/50 border-gray-800 backdrop-blur-sm pt-8">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-light text-white" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Partnership application</CardTitle>
                <CardDescription className="text-gray-400 text-md">
                  Join our exclusive network of business partners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-white">
                      Company name
                    </Label>
                    <Input
                      id="company"
                      placeholder="Your Company Ltd."
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-white">
                      Industry
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-white">
                      Contact person
                    </Label>
                    <Input
                      id="contact"
                      placeholder="John Smith"
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      Business email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employees" className="text-white">
                    Number of employees
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="10-50">10-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements" className="text-white">
                    Catering requirements
                  </Label>
                  <Textarea
                    id="requirements"
                    placeholder="Tell us about your typical catering needs, frequency, group sizes, etc."
                    className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
                  />
                </div>

                <div className="flex gap-6 pt-6 pb-2">
                  <Button
                    onClick={() => setCurrentView("hero")}
                    variant="outline"
                    className="flex-1 border-gray-700 text-white hover:bg-gray-800 h-12"
                  >
                    Back
                  </Button>
                  <Button className="flex-1 bg-white text-black hover:bg-gray-100 h-12">Submit application</Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        )}

        {currentView === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen p-6 pt-24"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8 pt-10">
                <div>
                  <h1 className="text-4xl font-light text-white mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Menu</h1>
                  <p className="text-gray-300">Curated selections for large groups.</p>
                </div>
                <Button
                  onClick={() => {
                    if (isGroupOrderMode) {
                      setIsGroupOrderMode(false)
                      setShowGroupOrderDashboard(true)
                    } else {
                      setCurrentView("hero")
                    }
                  }}
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800 uppercase text-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  {isGroupOrderMode ? "Back to Dashboard" : "Back"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoadingMenu ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f8f68f]"></div>
                    <p className="text-[#f8f68f] text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      ASSEMBLING YOUR FLAVOR ARMY...
                    </p>
                    <p className="text-gray-400 text-sm">Preparing something epic</p>
                  </div>
                ) : menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden group cursor-pointer">
                      <div 
                        className="relative overflow-hidden"
                        onClick={() => openProductModal(item)}
                      >
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge className="absolute top-3 left-3 bg-white text-black">{item.category}</Badge>
                      </div>
                      <CardContent 
                        className="p-6 cursor-pointer"
                        onClick={() => openProductModal(item)}
                      >
                        <h3 className="text-2xl uppercase font-medium text-white mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>{item.name}</h3>
                        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-light text-white">£{item.price}</span>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              openProductModal(item)
                            }}
                            size="sm"
                            className="bg-[#f8f68f] text-black hover:bg-gray-100 rounded-full transition-transform hover:scale-110"
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentView === "cart" && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen p-6 pt-24"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8 pt-14">
                <h1 className="text-4xl font-light text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Order summary</h1>
                <Button
                  onClick={() => setCurrentView("menu")}
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800 uppercase text-xl"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Back to Menu
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cart.length === 0 ? (
                    <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                      <div className="space-y-4">
                        <p className="text-gray-400 text-lg">Your cart is lonelier than a sad desk salad</p>
                        <p className="text-[#f8f68f] font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          LET'S FIX THAT!
                        </p>
                      </div>
                    </Card>
                  ) : (
                    cart.map((item) => (
                      <Card key={item.id} className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-2xl font-medium text-white" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>{item.name}</h3>
                              <p className="text-gray-400 text-sm">{item.description}</p>
                              <p className="text-white text-xl font-medium mt-2">£{item.price}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => updateQuantity(item.id, -1)}
                                size="sm"
                                variant="outline"
                                className="border-zinc-700 text-white hover:bg-zinc-800"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                              <Button
                                onClick={() => updateQuantity(item.id, 1)}
                                size="sm"
                                variant="outline"
                                className="border-zinc-700 text-white hover:bg-zinc-800"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                <div className="space-y-6">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Pickup Location */}
                      <div className="space-y-2">
                        <Label className="text-white flex items-center text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Pickup Location
                        </Label>
                        <div className="bg-black/30 border border-zinc-700 rounded p-3">
                          <p className="text-white font-medium">
                            {venues.find(v => v.id === selectedVenue)?.name}
                          </p>
                          <p className="text-zinc-400 text-sm">
                            {venues.find(v => v.id === selectedVenue)?.address}
                          </p>
                        </div>
                      </div>
                      
                      {/* Pickup Time */}
                      <div className="space-y-2">
                        <Label className="text-white flex items-center text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Pickup Time
                        </Label>
                        <div className="bg-black/30 border border-zinc-700 rounded p-3">
                          <p className="text-white font-medium">
                            {new Date(selectedTime).toLocaleDateString('en-GB', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-zinc-400 text-sm">
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
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <Card 
                          className={`cursor-pointer transition-all duration-200 ${
                            paymentMethod === "card"
                              ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                              : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
                          }`}
                          onClick={() => setPaymentMethod("card")}
                        >
                          <CardContent className="p-4 text-center">
                            <CreditCard className="h-8 w-8 mx-auto mb-2 text-[#f8f68f]" />
                            <h3 className="text-white font-medium text-lg uppercase mb-1" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              Card Payment
                            </h3>
                            <p className="text-gray-400 text-xs">Pay now with card</p>
                          </CardContent>
                        </Card>

                        <Card 
                          className={`cursor-pointer transition-all duration-200 ${
                            paymentMethod === "invoice"
                              ? 'bg-[#f8f68f]/20 border-[#f8f68f] ring-2 ring-[#f8f68f]/50' 
                              : 'bg-black/30 border-zinc-700 hover:border-zinc-600'
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
                            <FileText className="h-8 w-8 mx-auto mb-2 text-[#f8f68f]" />
                            <h3 className="text-white font-medium text-lg uppercase mb-1" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              Invoice
                            </h3>
                            <p className="text-gray-400 text-xs">
                              {isInvoiceApproved ? "Approved - Pay later" : "Apply for invoice terms"}
                            </p>
                            {isInvoiceApproved && (
                              <Badge className="mt-2 bg-green-600 text-white text-xs">APPROVED</Badge>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                      
                      {paymentMethod === "invoice" && isInvoiceApproved && (
                        <div className="bg-[#f8f68f]/10 border-[#f8f68f]/30 rounded p-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-[#f8f68f]" />
                            <p className="text-white text-sm">
                              Invoice terms approved. Payment due within 30 days.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white uppercase text-2xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-400">
                          <span>Subtotal</span>
                          <span>£{getTotalPrice()}</span>
                        </div>
                        {guestCount && (
                          <div className="flex justify-between text-white font-medium text-lg pt-2 border-t border-gray-700">
                            <span>Total ({guestCount} guests)</span>
                            <span>£{getTotalPrice() * Number.parseInt(guestCount || "0")}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={completeOrder}
                        className="w-full mt-6 bg-[#f8f68f] text-black hover:from-[#e6e346] hover:to-[#d4d123] font-medium uppercase shadow-lg text-xl"
                        style={{ fontFamily: '"alternate-gothic-atf", sans-serif', letterSpacing: '0.02em' }}
                        disabled={!selectedVenue || !selectedDate || !selectedHour || cart.length === 0 || (paymentMethod === "invoice" && !isInvoiceApproved)}
                      >
                        {!selectedVenue || !selectedDate || !selectedHour || cart.length === 0 
                          ? "COMPLETE YOUR ORDER" 
                          : paymentMethod === "invoice" && !isInvoiceApproved
                          ? "APPLY FOR INVOICE TERMS"
                          : "YOLK YES! LET'S GO"}
                      </Button>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        {paymentMethod === "card" 
                          ? "Secure payment processing" 
                          : "Pay later, party now - we trust you!"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Product Details Modal */}
      <Dialog open={productModalOpen} onOpenChange={closeProductModal}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden [&>button]:hidden">
          {selectedProduct && (
            <>
              {/* Product Image */}
              <div className="relative w-full aspect-video overflow-hidden">
                <img
                  src={selectedProduct.image || "/placeholder.svg"}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <Badge className="absolute top-4 left-4 bg-[#f8f68f] text-black font-medium">
                  {selectedProduct.category}
                </Badge>
                <Button
                  onClick={closeProductModal}
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4 text-white hover:bg-black/20 rounded-full w-8 h-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Product Info */}
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold uppercase text-white" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    {selectedProduct.name}
                  </h2>
                  <p className="text-gray-300 leading-relaxed">
                    {selectedProduct.description}
                  </p>

                </div>

                {/* Nutritional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-lg font-medium text-[#f8f68f] uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      Allergens
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs border-zinc-700 text-gray-300">Gluten</Badge>
                      <Badge variant="outline" className="text-xs border-zinc-700 text-gray-300">Dairy</Badge>
                      <Badge variant="outline" className="text-xs border-zinc-700 text-gray-300">Eggs</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-medium text-[#f8f68f] uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      Macros (approx)
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                      <div className="text-center">
                        <div className="font-medium">420</div>
                        <div className="text-gray-400">Calories</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">28g</div>
                        <div className="text-gray-400">Protein</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">32g</div>
                        <div className="text-gray-400">Carbs</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="flex items-center space-x-4">
                    <span className="text-lg text-gray-300 font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                      QUANTITY
                    </span>
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-white hover:bg-zinc-800 rounded-full w-8 h-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-medium text-white w-8 text-center">
                        {modalQuantity}
                      </span>
                      <Button
                        onClick={() => setModalQuantity(modalQuantity + 1)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-white hover:bg-zinc-800 rounded-full w-8 h-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Total</div>
                    <div className="text-xl font-bold text-white">
                      £{(selectedProduct.price * modalQuantity).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={addToCartFromModal}
                  className="w-full bg-[#f8f68f] text-black hover:from-[#e6e346] hover:to-[#d4d123] font-bold uppercase text-xl py-3 shadow-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  ADD TO CART - £{(selectedProduct.price * modalQuantity).toFixed(2)}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    BREWCLUB
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
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#f8f68f] transition-colors text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    SUPPORT
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
    </div>
  )
}
