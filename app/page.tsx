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
import { Calendar, Building2, ArrowRight, Plus, Minus, ShoppingCart, CheckCircle } from "lucide-react"
import { AuroraBackground } from "@/components/ui/aurora-background"

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

export default function YolkBusinessPortal() {
  const [currentView, setCurrentView] = useState("hero")
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderDate, setOrderDate] = useState("")
  const [guestCount, setGuestCount] = useState("")
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(false)

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

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id)
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
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

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {currentView === "hero" && (
          <AuroraBackground className="bg-black">
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
                  <h1 className="text-7xl md:text-9xl font-thin tracking-tight mb-6">
                    <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">YOLK</span>
                  </h1>
                  <Badge className="absolute -top-2 -right-12 bg-black text-white px-3 py-1 text-xs font-medium">
                    BUSINESS
                  </Badge>
                </div>
                <p className="text-xl md:text-xl text-gray-100 mb-8 font-light">Good bites only. For any business.</p>
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
                  className="bg-white text-black hover:bg-gray-300 px-5 py-6 text-sm font-medium rounded-full transition-all duration-300"
                >
                  Become partner
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setCurrentView("menu")}
                  variant="outline"
                  className="text-white hover:bg-[#212121] hover:text-white px-5 py-6 text-sm font-medium rounded-full transition-all duration-300 "
                >
                  Browse menu
                </Button>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
              >
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-4 text-gray-100" />
                  <h3 className="text-md font-medium mb-2 text-gray-100">3+ days notice</h3>
                  <p className="text-gray-400 text-sm">Advanced ordering for perfect preparation</p>
                </div>
                <div className="text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-4 text-gray-100" />
                  <h3 className="text-md font-medium mb-2 text-gray-100">Business partners</h3>
                  <p className="text-gray-400 text-sm">Exclusive access for verified companies</p>
                </div>
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-4 text-gray-100" />
                  <h3 className="text-md font-medium mb-2 text-gray-100">Flexible billing</h3>
                  <p className="text-gray-400 text-sm">No prepayment, invoice after service</p>
                </div>
              </motion.div>
            </motion.div>
          </AuroraBackground>
        )}

        {currentView === "apply" && (
          <AuroraBackground className="bg-black">
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
                <CardTitle className="text-2xl font-light text-white">Partnership application</CardTitle>
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
          </AuroraBackground>
        )}

        {currentView === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen p-6"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-light text-white mb-2">Menu</h1>
                  <p className="text-gray-400">Curated selections for businesses</p>
                </div>
                <div className="flex items-center gap-4">
                  {getTotalItems() > 0 && (
                    <Button
                      onClick={() => setCurrentView("cart")}
                      className="bg-white text-black hover:bg-gray-100 relative"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Cart ({getTotalItems()})
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">{getTotalItems()}</Badge>
                    </Button>
                  )}
                  <Button
                    onClick={() => setCurrentView("hero")}
                    variant="outline"
                    className="border-gray-700 text-white hover:bg-gray-800"
                  >
                    Back
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-300 overflow-hidden group">
                      <div className="relative overflow-hidden">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge className="absolute top-3 left-3 bg-white text-black">{item.category}</Badge>
                      </div>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-medium text-white mb-2">{item.name}</h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-light text-white">${item.price}</span>
                          <Button
                            onClick={() => addToCart(item)}
                            size="sm"
                            className="bg-white text-black hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
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
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-light text-white">Order summary</h1>
                <Button
                  onClick={() => setCurrentView("menu")}
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  Back to Menu
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cart.length === 0 ? (
                    <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
                      <p className="text-gray-400">Your cart is empty</p>
                    </Card>
                  ) : (
                    cart.map((item) => (
                      <Card key={item.id} className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-white">{item.name}</h3>
                              <p className="text-gray-400 text-sm">{item.description}</p>
                              <p className="text-white font-medium mt-2">${item.price} per person</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => updateQuantity(item.id, -1)}
                                size="sm"
                                variant="outline"
                                className="border-gray-700 text-white hover:bg-gray-800"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                              <Button
                                onClick={() => updateQuantity(item.id, 1)}
                                size="sm"
                                variant="outline"
                                className="border-gray-700 text-white hover:bg-gray-800"
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
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-white">
                          Event Date
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={orderDate}
                          onChange={(e) => setOrderDate(e.target.value)}
                          min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                          className="bg-black/50 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guests" className="text-white">
                          Number of Guests
                        </Label>
                        <Input
                          id="guests"
                          type="number"
                          placeholder="50"
                          value={guestCount}
                          onChange={(e) => setGuestCount(e.target.value)}
                          className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-gray-400">
                          <span>Subtotal per person</span>
                          <span>${getTotalPrice()}</span>
                        </div>
                        {guestCount && (
                          <div className="flex justify-between text-white font-medium text-lg pt-2 border-t border-gray-700">
                            <span>Total ({guestCount} guests)</span>
                            <span>${getTotalPrice() * Number.parseInt(guestCount || "0")}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full mt-6 bg-white text-black hover:bg-gray-100"
                        disabled={!orderDate || !guestCount || cart.length === 0}
                      >
                        Place Order
                      </Button>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        No prepayment required. Invoice will be sent after service.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
