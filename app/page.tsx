"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Building2, ArrowRight, Plus, Minus, ShoppingCart, CheckCircle, X, MapPin, Truck, CreditCard, FileText, Users, Link, Clock, Search } from "lucide-react"
import { supabase, type RealtimeGroupOrder, type RealtimeGroupOrderItem, signOut } from "@/lib/supabase"
import { useAuth } from "./context/AuthContext"
import GroupOrderDashboardModal from "./components/GroupOrderDashboardModal"

// Google Maps types
declare global {
  interface Window {
    google: any
  }
}

interface GoogleMapProps {
  venues: typeof venues
  selectedVenue: string
  onVenueSelect: (venueId: string) => void
  deliveryAddress: string
  onAddressChange: (address: string) => void
  onAddressSelect: (address: string) => void
  isGeocodingAddress: boolean
}

// Custom Map Component
const GoogleMapComponent = ({ 
  venues, 
  selectedVenue, 
  onVenueSelect, 
  deliveryAddress, 
  onAddressChange, 
  onAddressSelect,
  isGeocodingAddress 
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const autocompleteRef = useRef<any>(null)
  const searchBoxRef = useRef<HTMLInputElement>(null)

  // Light mode map styles
  const mapStyles = [
    {
      "featureType": "all",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }]
    },
    {
      "featureType": "all",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "all",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#333333" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#cccccc" }]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [{ "color": "#f8f8f8" }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#e8e8e8" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#cccccc" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#333333" }]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{ "color": "#e8e8e8" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#e6f3ff" }]
    }
  ]

  useEffect(() => {
    // Load Google Maps API only once
    const loadGoogleMaps = () => {
      // Debug: Log the API key (first few characters only for security)
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY'
      console.log('Google Maps API Key loaded:', apiKey.substring(0, 10) + '...')
      
      if (window.google && window.google.maps) {
        initializeMap()
        return
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for existing script to load
        const checkGoogleMaps = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogleMaps)
            initializeMap()
          }
        }, 100)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initializeMap
      script.onerror = () => {
        console.error('Failed to load Google Maps API')
        // Show fallback content
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full bg-zinc-800 rounded-2xl">
              <div class="text-center p-8">
                <div class="text-[#f8f68f] text-4xl mb-4">🗺️</div>
                <h3 class="text-white font-bold mb-2 uppercase" style="font-family: 'alternate-gothic-atf', sans-serif;">Map Unavailable</h3>
                <p class="text-gray-400 text-sm mb-4">Please select a venue from the list below</p>
                <div class="grid grid-cols-1 gap-3">
                  ${venues.map(venue => `
                    <div class="bg-black/30 border border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-[#f8f68f] transition-colors" 
                         onclick="window.selectVenue('${venue.id}')">
                      <h4 class="text-white font-bold text-sm uppercase">${venue.name}</h4>
                      <p class="text-gray-400 text-xs">${venue.address}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `
          // Add global function for venue selection
          ;(window as any).selectVenue = onVenueSelect
        }
      }
      document.head.appendChild(script)
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.google) {
        console.error('Map container or Google Maps not available')
        return
      }

      try {
        // Create map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 51.5074, lng: -0.1278 }, // London center
          zoom: 12,
          styles: mapStyles,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          }
        })

                mapInstanceRef.current = map

        // Create custom YOLK YES markers
        venues.forEach((venue: any) => {
          const marker = new window.google.maps.Marker({
            position: { lat: venue.lat, lng: venue.lng },
            map: map,
            title: venue.name,
            icon: {
              url: '/yolk-pin.png',
              scaledSize: new window.google.maps.Size(40, 60),
              anchor: new window.google.maps.Point(20, 20)
            },
            animation: selectedVenue === venue.id ? window.google.maps.Animation.BOUNCE : null
          })

          // Add click listener
          marker.addListener('click', () => {
            onVenueSelect(venue.id)
          })

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 10px; max-width: 200px;">
                <h3 style="margin: 0 0 5px 0; color: #f8f68f; font-weight: bold;">${venue.name}</h3>
                <p style="margin: 0; color: #333; font-size: 12px;">${venue.address}</p>
              </div>
            `
          })

          marker.addListener('click', () => {
            infoWindow.open(map, marker)
          })

          markersRef.current.push(marker)
        })

        // Initialize Places Autocomplete
        if (searchBoxRef.current) {
          console.log('Initializing Places Autocomplete...')
          autocompleteRef.current = new window.google.maps.places.Autocomplete(searchBoxRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'GB' }
          })

          autocompleteRef.current.addListener('place_changed', () => {
            console.log('Place changed event triggered')
            const place = autocompleteRef.current.getPlace()
            console.log('Selected place:', place)
            
            // Check if place has valid data
            if (place && place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat()
              const lng = place.geometry.location.lng()
              console.log('Place coordinates:', lat, lng)
              
              // Find closest venue
              let closestVenue = venues[0]
              let minDistance = calculateDistance(lat, lng, venues[0].lat, venues[0].lng)
              
              venues.forEach((venue: any) => {
                const distance = calculateDistance(lat, lng, venue.lat, venue.lng)
                console.log(`Distance to ${venue.name}: ${distance.toFixed(1)}km`)
                if (distance < minDistance) {
                  minDistance = distance
                  closestVenue = venue
                }
              })

              console.log(`Closest venue: ${closestVenue.name} (${minDistance.toFixed(1)}km away)`)

              // Select closest venue
              onVenueSelect(closestVenue.id)
              
              // Update address
              onAddressSelect(place.formatted_address || place.name || deliveryAddress)
              
              // Pan map to selected venue
              if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo({ lat: closestVenue.lat, lng: closestVenue.lng })
                mapInstanceRef.current.setZoom(14)
              }
              
              // Show success message
              console.log(`Auto-selected nearest YOLK: ${closestVenue.name} (${minDistance.toFixed(1)}km away)`)
            } else {
              console.log('No valid geometry found for selected place, trying manual geocoding...')
              // Fallback to manual geocoding
              if (place && (place.formatted_address || place.name)) {
                const addressToGeocode = place.formatted_address || place.name
                console.log('Attempting to geocode:', addressToGeocode)
                
                // Use the manual geocoding logic
                const geocoder = new window.google.maps.Geocoder()
                geocoder.geocode({ 
                  address: addressToGeocode,
                  componentRestrictions: { country: 'GB' }
                }, (results: any, status: any) => {
                  console.log('Fallback geocoding results:', results, 'Status:', status)
                  
                  if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location
                    const lat = location.lat()
                    const lng = location.lng()
                    
                    // Find closest venue
                    let closestVenue = venues[0]
                    let minDistance = calculateDistance(lat, lng, venues[0].lat, venues[0].lng)
                    
                    venues.forEach((venue: any) => {
                      const distance = calculateDistance(lat, lng, venue.lat, venue.lng)
                      if (distance < minDistance) {
                        minDistance = distance
                        closestVenue = venue
                      }
                    })
                    
                    // Select closest venue
                    onVenueSelect(closestVenue.id)
                    
                    // Pan map to selected venue
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo({ lat: closestVenue.lat, lng: closestVenue.lng })
                      mapInstanceRef.current.setZoom(14)
                    }
                  }
                })
              }
            }
          })
          
          console.log('Places Autocomplete initialized successfully')
        } else {
          console.log('Search box ref not available')
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error)
        // Show fallback content
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full bg-zinc-800 rounded-2xl">
              <div class="text-center p-8">
                <div class="text-[#f8f68f] text-4xl mb-4">🗺️</div>
                <h3 class="text-white font-bold mb-2 uppercase" style="font-family: 'alternate-gothic-atf', sans-serif;">Map Unavailable</h3>
                <p class="text-gray-400 text-sm mb-4">Please select a venue from the list below</p>
                <div class="grid grid-cols-1 gap-3">
                  ${venues.map((venue: any) => `
                    <div class="bg-black/30 border border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-[#f8f68f] transition-colors" 
                         onclick="window.selectVenue('${venue.id}')">
                      <h4 class="text-white font-bold text-sm uppercase">${venue.name}</h4>
                      <p class="text-gray-400 text-xs">${venue.address}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `
          // Add global function for venue selection
          ;(window as any).selectVenue = onVenueSelect
        }
      }
    }

    loadGoogleMaps()

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
    }
  }, [venues, selectedVenue, onVenueSelect, onAddressSelect])

  // Update marker animations when selected venue changes
  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      if (venues[index] && venues[index].id === selectedVenue) {
        marker.setAnimation(window.google?.maps?.Animation?.BOUNCE)
      } else {
        marker.setAnimation(null)
      }
    })
  }, [selectedVenue, venues])

  return (
    <div className="space-y-6">
      {/* Address Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            ref={searchBoxRef}
            value={deliveryAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deliveryAddress.trim()) {
                e.preventDefault()
                // Trigger the same logic as the button
                const geocoder = new window.google.maps.Geocoder()
                geocoder.geocode({ 
                  address: deliveryAddress,
                  componentRestrictions: { country: 'GB' }
                }, (results: any, status: any) => {
                  console.log('Enter key geocoding results:', results, 'Status:', status)
                  
                  if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location
                    const lat = location.lat()
                    const lng = location.lng()
                    
                    console.log('Enter key geocoded coordinates:', lat, lng)
                    
                    // Find closest venue
                    let closestVenue = venues[0]
                    let minDistance = calculateDistance(lat, lng, venues[0].lat, venues[0].lng)
                    
                    venues.forEach((venue: any) => {
                      const distance = calculateDistance(lat, lng, venue.lat, venue.lng)
                      console.log(`Distance to ${venue.name}: ${distance.toFixed(1)}km`)
                      if (distance < minDistance) {
                        minDistance = distance
                        closestVenue = venue
                      }
                    })
                    
                    console.log(`Closest venue: ${closestVenue.name} (${minDistance.toFixed(1)}km away)`)
                    
                    // Select closest venue
                    onVenueSelect(closestVenue.id)
                    
                    // Pan map to selected venue
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo({ lat: closestVenue.lat, lng: closestVenue.lng })
                      mapInstanceRef.current.setZoom(14)
                    }
                  } else {
                    console.error('Enter key geocoding failed:', status, results)
                  }
                })
              }
            }}
            placeholder="Enter your delivery address..."
            className="h-14 pl-10 bg-white/50 border-zinc-200 text-black placeholder:text-gray-500"
            disabled={isGeocodingAddress}
          />
          {isGeocodingAddress && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#f8f68f]"></div>
            </div>
          )}
        </div>
        
        {/* Manual submit button as fallback */}
        <Button
          onClick={async () => {
            if (!deliveryAddress.trim()) return
            
            console.log('Manual address submission:', deliveryAddress)
            
            try {
              // Use Google Geocoding API to get coordinates
              const geocoder = new window.google.maps.Geocoder()
              geocoder.geocode({ 
                address: deliveryAddress,
                componentRestrictions: { country: 'GB' }
              }, (results: any, status: any) => {
                console.log('Geocoding results:', results, 'Status:', status)
                
                if (status === 'OK' && results && results[0]) {
                  const location = results[0].geometry.location
                  const lat = location.lat()
                  const lng = location.lng()
                  
                  console.log('Geocoded coordinates:', lat, lng)
                  
                  // Find closest venue
                  let closestVenue = venues[0]
                  let minDistance = calculateDistance(lat, lng, venues[0].lat, venues[0].lng)
                  
                  venues.forEach((venue: any) => {
                    const distance = calculateDistance(lat, lng, venue.lat, venue.lng)
                    console.log(`Distance to ${venue.name}: ${distance.toFixed(1)}km`)
                    if (distance < minDistance) {
                      minDistance = distance
                      closestVenue = venue
                    }
                  })
                  
                  console.log(`Closest venue: ${closestVenue.name} (${minDistance.toFixed(1)}km away)`)
                  
                  // Select closest venue
                  onVenueSelect(closestVenue.id)
                  
                  // Pan map to selected venue
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo({ lat: closestVenue.lat, lng: closestVenue.lng })
                    mapInstanceRef.current.setZoom(14)
                  }
                } else {
                  console.error('Geocoding failed:', status, results)
                  alert('Could not find that address. Please try a more specific address.')
                }
              })
            } catch (error) {
              console.error('Error geocoding address:', error)
              alert('Error processing address. Please try again.')
            }
          }}
          disabled={!deliveryAddress.trim()}
          className="h-14 w-full bg-[#f8f68f] text-black hover:bg-[#fffeee] uppercase text-lg"
          style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
        >
          Search
        </Button>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-[400px] rounded-2xl border border-zinc-200 overflow-hidden"
        />
        
        {/* Map Overlay Info */}
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-zinc-700 rounded-lg p-3">
          <h4 className="text-white font-bold text-sm uppercase mb-1" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
            YOLK Locations
          </h4>
          <p className="text-gray-300 text-xs">
            Click on YOLK YES pins to select venue
          </p>
        </div>
      </div>

      {/* Selected Venue Info */}
      {selectedVenue && (
        <div className="bg-[#000000]/10 border border-[#f8f68f]/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-[#f8f68f]" />
              <div>
                <p className="text-black font-medium text-2xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  Selected: Yolk {venues.find(v => v.id === selectedVenue)?.name}
                </p>
                <p className="text-zinc-600 text-sm">
                  {venues.find(v => v.id === selectedVenue)?.address}
                </p>
              </div>
            </div>
            <Button
              onClick={() => onVenueSelect("")}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const { user, loading, isManager } = useAuth()
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
  const [currentGroupOrder, setCurrentGroupOrder] = useState<RealtimeGroupOrder | null>(null)
  const [groupOrders, setGroupOrders] = useState<Array<{
    id: string
    personName: string
    items: CartItem[]
    totalSpent: number
    timestamp: Date
  }>>([])
  const [isGroupOrderMode, setIsGroupOrderMode] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [groupOrderNotFound, setGroupOrderNotFound] = useState(false)
  const [isTeamMemberMode, setIsTeamMemberMode] = useState(false)

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

  // Handle group order URL parameters and real-time subscriptions
  useEffect(() => {
    // Test Supabase connection
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Key (first 10 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10))
    
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('group_orders').select('count').limit(1)
        if (error) {
          console.error('Supabase connection test failed:', error)
        } else {
          console.log('Supabase connection test successful')
        }
      } catch (err) {
        console.error('Supabase connection test error:', err)
      }
    }
    
    testConnection()
    
    const urlParams = new URLSearchParams(window.location.search)
    const groupOrderId = urlParams.get('group-order')
    const isManagerView = urlParams.get('manager') === 'true'
    
    if (groupOrderId) {
      console.log('Group order ID detected in URL:', groupOrderId)
      // Set up real-time subscription for group order updates
      const setupRealtimeSubscription = async () => {
        console.log('Setting up real-time subscription for group order:', groupOrderId)
        
        try {
          // First, try localStorage fallback (for demo/testing)
          const existingGroupOrder = localStorage.getItem(`groupOrder_${groupOrderId}`)
          if (existingGroupOrder) {
            console.log('Found group order in localStorage:', existingGroupOrder)
            const parsedData = JSON.parse(existingGroupOrder)
            
            // Set all the group order data
          setGroupOrderId(groupOrderId)
          setGroupOrderUrl(window.location.href)
            setIndividualBudget(parsedData.budget?.toString() || "25")
            setTeamSize(parsedData.teamSize?.toString() || "10")
            setOrderDeadline(parsedData.deadline || "2 days before pickup")
            setGroupOrders(parsedData.orders || [])
            setSelectedVenue(parsedData.venue || "")
            setSelectedTime(parsedData.time || "")
                      setDeliveryType(parsedData.deliveryType || "collection")
          setDeliveryAddress(parsedData.deliveryAddress || "")
          setIsGroupOrderMode(true)
          setIsTeamMemberMode(!isManagerView)
          
          if (isManagerView) {
            // For manager view, open the group order dashboard
            setShowGroupOrderDashboard(true)
          }
          // Don't navigate to menu immediately - let them see the hero first
          // setCurrentView("menu")
          
          console.log('Group order loaded from localStorage, staying on hero')
          return
          }

          // If no localStorage data, try Supabase
          console.log('No localStorage data, trying Supabase...')
          const { data: groupOrderData, error: groupOrderError } = await supabase
            .from('group_orders')
            .select('*')
            .eq('id', groupOrderId)
            .single()

          if (groupOrderError) {
            console.error('Error fetching group order from Supabase:', groupOrderError)
            console.log('No group order found in Supabase or localStorage')
            console.log('Please create a group order first, or check if the group order ID is correct')
            setGroupOrderNotFound(true)
            return
          }

          // Set group order data
          console.log('Group order data from Supabase:', groupOrderData)
          setGroupOrderId(groupOrderId)
          setGroupOrderUrl(window.location.href)
          setCurrentGroupOrder(groupOrderData)
          setIndividualBudget(groupOrderData.budget?.toString() || "25")
          setTeamSize(groupOrderData.team_size?.toString() || "10")
          setOrderDeadline(groupOrderData.deadline || "2 days before pickup")
          setSelectedVenue(groupOrderData.venue || "")
          setSelectedTime(groupOrderData.time || "")
          setDeliveryType(groupOrderData.delivery_type || "collection")
          setDeliveryAddress(groupOrderData.delivery_address || "")
          setIsGroupOrderMode(true)
          setIsTeamMemberMode(!isManagerView)
          
          if (isManagerView) {
            // For manager view, open the group order dashboard
            setShowGroupOrderDashboard(true)
          }
          // Don't navigate to menu immediately - let them see the hero first
          // setCurrentView("menu")
          
          console.log('Group order loaded from Supabase, staying on hero')

          // Fetch group order items
          const { data: itemsData, error: itemsError } = await supabase
            .from('group_order_items')
            .select('*')
            .eq('group_order_id', groupOrderId)
            .order('created_at', { ascending: true })

          if (itemsError) {
            console.error('Error fetching group order items:', itemsError)
            return
          }

          // Transform items to match our local format
          const transformedOrders = transformSupabaseItemsToLocalFormat(itemsData)
          setGroupOrders(transformedOrders)

          // Set up real-time subscription for group order items
          console.log('Setting up real-time subscription for group order:', groupOrderId)
          
          const subscription = supabase
            .channel(`group-order-${groupOrderId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'group_order_items',
                filter: `group_order_id=eq.${groupOrderId}`
              },
              (payload) => {
                console.log('Real-time update received:', payload)
                setIsRealtimeConnected(true)
                
                // Immediately refresh the data when we receive an update
                const refreshData = async () => {
                  const { data: itemsData, error: itemsError } = await supabase
                    .from('group_order_items')
                    .select('*')
                    .eq('group_order_id', groupOrderId)
                    .order('created_at', { ascending: true })

                  if (itemsError) {
                    console.error('Error refreshing data after real-time update:', itemsError)
      } else {
                    console.log('Data refreshed after real-time update:', itemsData)
                    const transformedOrders = transformSupabaseItemsToLocalFormat(itemsData)
                    setGroupOrders(transformedOrders)
                  }
                }
                
                refreshData()
                
                // Simplified: Just log the event type for debugging
                console.log('Event type:', payload.eventType, 'Payload:', payload)
              }
            )
            .subscribe((status) => {
              console.log('Subscription status:', status)
              if (status === 'SUBSCRIBED') {
                console.log('Real-time subscription established successfully')
                setIsRealtimeConnected(true)
              } else if (status === 'CHANNEL_ERROR') {
                console.error('Real-time subscription failed')
                setIsRealtimeConnected(false)
              } else if (status === 'TIMED_OUT') {
                console.error('Real-time subscription timed out')
                setIsRealtimeConnected(false)
              } else if (status === 'CLOSED') {
                console.log('Real-time subscription closed')
                setIsRealtimeConnected(false)
              }
            })

          // Set up periodic refresh as fallback (every 5 seconds)
          const refreshInterval = setInterval(async () => {
            if (groupOrderId) {
              const { data: itemsData, error: itemsError } = await supabase
                .from('group_order_items')
                .select('*')
                .eq('group_order_id', groupOrderId)
                .order('created_at', { ascending: true })

              if (!itemsError && itemsData) {
                const transformedOrders = transformSupabaseItemsToLocalFormat(itemsData)
                setGroupOrders(transformedOrders)
              }
            }
          }, 5000)

          // Cleanup subscription and interval on unmount
          return () => {
            subscription.unsubscribe()
            clearInterval(refreshInterval)
            setIsRealtimeConnected(false)
          }
        } catch (error) {
          console.error('Error setting up real-time subscription:', error)
        }
      }

      setupRealtimeSubscription()
    }
  }, [])

  // Helper function to transform Supabase items to local format
  const transformSupabaseItemsToLocalFormat = (items: RealtimeGroupOrderItem[]) => {
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

  const addToCart = async (item: MenuItem) => {
    if (isGroupOrderMode && groupOrderId) {
      // Check if order is finalized (team members can't add to finalized orders)
      if (isTeamMemberMode && currentGroupOrder?.status === 'finalized') {
        alert('This order has been finalized by the manager. You can no longer add items.')
        return
      }
      
      // Check budget limit for team members
      if (isTeamMemberMode && individualBudget) {
        const currentSpending = groupOrders.find(order => order.personName === "You")?.totalSpent || 0
        const remainingBudget = Number(individualBudget) - currentSpending
        
        if (remainingBudget < item.price) {
          alert(`Sorry! This item costs £${item.price} but you only have £${remainingBudget.toFixed(2)} remaining in your budget.`)
          return
        }
      }
      try {
      // Check if user already has an order in this group
      const existingUserOrder = groupOrders.find(order => order.personName === "You")
      
      if (existingUserOrder) {
          // Check if item already exists in user's order
          const existingItem = existingUserOrder.items.find(itemInOrder => itemInOrder.id === item.id)
          
          if (existingItem) {
            // Update quantity of existing item in Supabase
            console.log('Updating existing item in Supabase:', item.id, 'new quantity:', existingItem.quantity + 1)
            const { data, error } = await supabase
              .from('group_order_items')
              .update({ 
                quantity: existingItem.quantity + 1,
                total_spent: (existingItem.quantity + 1) * item.price
              })
              .eq('group_order_id', groupOrderId)
              .eq('person_name', 'You')
              .eq('product_id', item.id)
              .select()
            
            if (error) {
              console.error('Error updating item in Supabase:', error)
              // Fallback to localStorage
              updateGroupOrderLocally(item, true)
            } else {
              console.log('Successfully updated item in Supabase:', data)
            }
          } else {
            // Add new item to Supabase
            console.log('Adding new item to Supabase:', item.id)
            const { data, error } = await supabase
              .from('group_order_items')
              .insert({
                group_order_id: groupOrderId,
                person_name: 'You',
                product_id: item.id,
                product_name: item.name,
                product_description: item.description,
                product_price: item.price,
                product_category: item.category,
                product_image: item.image,
                quantity: 1,
                total_spent: item.price
              })
              .select()
            
            if (error) {
              console.error('Error adding item to Supabase:', error)
              // Fallback to localStorage
              updateGroupOrderLocally(item, false)
            } else {
              console.log('Successfully added item to Supabase:', data)
            }
          }
        } else {
          // Create new user order in Supabase
          console.log('Creating new user order in Supabase for item:', item.id)
          const { data, error } = await supabase
            .from('group_order_items')
            .insert({
              group_order_id: groupOrderId,
              person_name: 'You',
              product_id: item.id,
              product_name: item.name,
              product_description: item.description,
              product_price: item.price,
              product_category: item.category,
              product_image: item.image,
              quantity: 1,
              total_spent: item.price
            })
            .select()
          
          if (error) {
            console.error('Error creating new order in Supabase:', error)
            // Fallback to localStorage
            updateGroupOrderLocally(item, false)
          } else {
            console.log('Successfully created new order in Supabase:', data)
          }
        }
             } catch (error) {
         console.error('Error adding to group order:', error)
         // Fallback to localStorage
         const existingUserOrder = groupOrders.find(order => order.personName === "You")
         updateGroupOrderLocally(item, existingUserOrder?.items.find((itemInOrder: CartItem) => itemInOrder.id === item.id) ? true : false)
       }
    } else {
      // Standard cart (not group order)
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
    
    // Show YOLK YES! animation
    setShowYolkYes(true)
    setTimeout(() => setShowYolkYes(false), 2000)
  }

  // Fallback function for localStorage when Supabase is not available
  const updateGroupOrderLocally = (item: MenuItem, isExistingItem: boolean) => {
    const existingUserOrder = groupOrders.find(order => order.personName === "You")
    
    if (existingUserOrder) {
        setGroupOrders(prev => {
          const updatedOrders = prev.map(order => {
            if (order.personName === "You") {
            if (isExistingItem) {
                // Increase quantity of existing item
                const updatedItems = order.items.map(itemInOrder =>
                  itemInOrder.id === item.id 
                    ? { ...itemInOrder, quantity: itemInOrder.quantity + 1 }
                    : itemInOrder
                )
                return {
                  ...order,
                  items: updatedItems,
                  totalSpent: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                }
              } else {
                // Add new item to user's order
                const updatedItems = [...order.items, { ...item, quantity: 1 }]
                return {
                  ...order,
                  items: updatedItems,
                  totalSpent: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                }
              }
            }
            return order
          })
          
          // Save updated group orders to localStorage
          if (groupOrderId) {
            const existingData = localStorage.getItem(`groupOrder_${groupOrderId}`)
            if (existingData) {
              try {
                const groupOrderData = JSON.parse(existingData)
                groupOrderData.orders = updatedOrders
                localStorage.setItem(`groupOrder_${groupOrderId}`, JSON.stringify(groupOrderData))
              } catch (error) {
                console.error('Error updating group order data:', error)
              }
            }
          }
          
          return updatedOrders
        })
      } else {
        // Create new user order
        const newOrder = {
          id: Date.now().toString(),
          personName: "You",
          items: [{ ...item, quantity: 1 }],
          totalSpent: item.price,
          timestamp: new Date()
        }
        
        setGroupOrders(prev => {
          const updatedOrders = [...prev, newOrder]
          
          // Save updated group orders to localStorage
          if (groupOrderId) {
            const existingData = localStorage.getItem(`groupOrder_${groupOrderId}`)
            if (existingData) {
              try {
                const groupOrderData = JSON.parse(existingData)
                groupOrderData.orders = updatedOrders
                localStorage.setItem(`groupOrder_${groupOrderId}`, JSON.stringify(groupOrderData))
              } catch (error) {
                console.error('Error updating group order data:', error)
              }
            }
          }
          
          return updatedOrders
        })
    }
  }

  const updateQuantity = (id: string, change: number) => {
    if (isTeamMemberMode) {
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
        
        // Save updated group orders to localStorage
        if (groupOrderId) {
          const existingData = localStorage.getItem(`groupOrder_${groupOrderId}`)
          if (existingData) {
            try {
              const groupOrderData = JSON.parse(existingData)
              groupOrderData.orders = updatedOrders
              localStorage.setItem(`groupOrder_${groupOrderId}`, JSON.stringify(groupOrderData))
            } catch (error) {
              console.error('Error updating group order data:', error)
            }
          }
        }
        
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
      // Check budget limit for team members
      if (isTeamMemberMode && individualBudget) {
        const currentSpending = groupOrders.find(order => order.personName === "You")?.totalSpent || 0
        const totalCost = selectedProduct.price * modalQuantity
        const remainingBudget = Number(individualBudget) - currentSpending
        
        if (remainingBudget < totalCost) {
          alert(`Sorry! ${modalQuantity}x ${selectedProduct.name} costs £${totalCost.toFixed(2)} but you only have £${remainingBudget.toFixed(2)} remaining in your budget.`)
          return
        }
      }
      
      for (let i = 0; i < modalQuantity; i++) {
        addToCart(selectedProduct)
      }
      closeProductModal()
    }
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
      // Don't reset to hero view - stay on cart or go to appropriate view
      if (isGroupOrderMode) {
        // For group orders, go back to the group order dashboard
        setCurrentView("group-order-dashboard")
      } else {
        // For regular orders, go back to menu
        setCurrentView("menu")
      }
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

  // Reset order modal state but preserve selected venue and delivery address
  const resetOrderModalPreserveVenue = () => {
    const currentSelectedVenue = selectedVenue // Save current venue
    const currentDeliveryAddress = deliveryAddress // Save current delivery address
    setOrderStep(1)
    setDeliveryType("")
    setDeliveryAddress(currentDeliveryAddress) // Preserve delivery address
    setSelectedVenue(currentSelectedVenue) // Restore venue
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
    // Check if user is signed in
    if (!user) {
      // Redirect to login page
      window.location.href = '/auth/signin'
      return
    }
    
    resetOrderModalPreserveVenue()
    
    // Auto-detect delivery type and skip steps if venue is already selected
    if (selectedVenue) {
      // If they have a selected venue, determine delivery type based on address
      if (deliveryAddress && deliveryAddress.trim() !== "") {
        // They entered an address, so it's delivery
        setDeliveryType("delivery")
        setSuggestedVenue(venues.find(v => v.id === selectedVenue) || null)
        setOrderStep(3) // Skip to date/time selection
      } else {
        // No address entered, so it's collection
        setDeliveryType("collection")
        setOrderStep(3) // Skip to date/time selection
      }
    }
    
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
        
        // Create group order in Supabase
        const createGroupOrder = async () => {
          try {
            const { data, error } = await supabase
              .from('group_orders')
              .insert({
                id: orderId,
                budget: Number(individualBudget),
                team_size: Number(teamSize),
                deadline: orderDeadline,
                venue: selectedVenue,
                time: selectedTime,
                delivery_type: deliveryType,
                delivery_address: deliveryAddress || null,
                payment_method: 'card', // Default to card payment
                created_by: user?.id || null,
                status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()
            
                        if (error) {
              console.error('Error creating group order in Supabase:', error)
              // Fallback to localStorage
        const groupOrderData = {
          budget: individualBudget,
          teamSize: teamSize,
          deadline: orderDeadline,
          venue: selectedVenue,
          time: selectedTime,
          deliveryType: deliveryType,
          orders: [],
          createdAt: new Date().toISOString()
        }
        localStorage.setItem(`groupOrder_${orderId}`, JSON.stringify(groupOrderData))
            } else {
              // Store the created order data
              setCurrentGroupOrder(data)
            }
          } catch (error) {
            console.error('Error creating group order:', error)
            // Fallback to localStorage
            const groupOrderData = {
              budget: individualBudget,
              teamSize: teamSize,
              deadline: orderDeadline,
              venue: selectedVenue,
              time: selectedTime,
              deliveryType: deliveryType,
              orders: [],
              createdAt: new Date().toISOString()
            }
            localStorage.setItem(`groupOrder_${orderId}`, JSON.stringify(groupOrderData))
          }
        }
        
        createGroupOrder()
        setOrderModalOpen(false)
        setShowGroupOrderDashboard(true)
      }
    }
  }

  const prevOrderStep = () => {
    if (orderStep > 1) {
      // If we're on step 3 and we skipped venue selection, go back to step 1
      if (orderStep === 3 && selectedVenue) {
        setOrderStep(1)
      } else {
      setOrderStep(orderStep - 1)
      }
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

  const finalizeGroupOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('group_orders')
        .update({ 
          status: 'waiting_for_payment',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('created_by', user?.id)

      if (error) {
        console.error('Error finalizing group order:', error)
        alert('Failed to finalize order. Please try again.')
      } else {
        console.log('Group order finalized successfully')
        // Update local state
        setCurrentGroupOrder(prev => prev ? { ...prev, status: 'waiting_for_payment' } : null)
        alert('Order finalized successfully! Ready for payment.')
      }
    } catch (error) {
      console.error('Error finalizing order:', error)
      alert('Failed to finalize order. Please try again.')
    }
  }

  const updateGroupOrderDetails = async (updates: Partial<RealtimeGroupOrder>) => {
    if (!currentGroupOrder) return
    
    try {
      const { error } = await supabase
        .from('group_orders')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGroupOrder.id)
        .eq('created_by', user?.id)

      if (error) {
        console.error('Error updating group order:', error)
        alert('Failed to update order. Please try again.')
      } else {
        console.log('Group order updated successfully')
        // Update local state
        setCurrentGroupOrder(prev => prev ? { ...prev, ...updates } : null)
        alert('Order updated successfully!')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Failed to update order. Please try again.')
    }
  }

  // Simulate other team members adding items (for demo purposes)
  const simulateTeamMemberOrder = () => {
    if (groupOrderId && menuItems.length > 0) {
      const teamMembers = ["Sarah Johnson", "Mike Chen", "Emma Davis", "Alex Thompson"]
      const randomMember = teamMembers[Math.floor(Math.random() * teamMembers.length)]
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)]
      
      const newOrder = {
        id: Date.now().toString(),
        personName: randomMember,
        items: [{ ...randomItem, quantity: 1 }],
        totalSpent: randomItem.price,
        timestamp: new Date()
      }
      
      setGroupOrders(prev => {
        const updatedOrders = [...prev, newOrder]
        
        // Save updated group orders to localStorage
        const existingData = localStorage.getItem(`groupOrder_${groupOrderId}`)
        if (existingData) {
          try {
            const groupOrderData = JSON.parse(existingData)
            groupOrderData.orders = updatedOrders
            localStorage.setItem(`groupOrder_${groupOrderId}`, JSON.stringify(groupOrderData))
          } catch (error) {
            console.error('Error updating group order data:', error)
          }
        }
        
        return updatedOrders
      })
    }
  }

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-[#f8f68f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f8f68f] mx-auto"></div>
          <p className="text-[#f8f68f] text-xl font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
            LOADING...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden">
      {/* Group Order Not Found Alert */}
      <AnimatePresence>
        {groupOrderNotFound && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <X className="h-5 w-5" />
              <div>
                <h3 className="font-bold">Group Order Not Found</h3>
                <p className="text-sm">The group order link you're trying to access doesn't exist or has expired.</p>
              </div>
              <Button
                onClick={() => setGroupOrderNotFound(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  Business mail
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
      <GroupOrderDashboardModal
        isOpen={showGroupOrderDashboard}
        onClose={() => setShowGroupOrderDashboard(false)}
        groupOrder={currentGroupOrder}
      />

      {/* Order Setup Modal */}
      <Dialog open={orderModalOpen} onOpenChange={closeOrderModal}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white [&>button]:hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl font-light text-white uppercase text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              {orderStep === 1 && "How would you like your order?"}
              {orderStep === 2 && deliveryType === "delivery" && "Enter your delivery address"}
              {orderStep === 2 && deliveryType === "collection" && "Choose your collection point"}
              {orderStep === 3 && "When would you like it?"}
              {orderStep === 4 && "What type of order?"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 p-6">
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
                      <p className="text-gray-400 text-sm">
                        {selectedVenue 
                          ? `Pick up from YOLK ${venues.find(v => v.id === selectedVenue)?.name}`
                          : "Pick up from your chosen YOLK"
                        }
                      </p>
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
                      
                      <GoogleMapComponent
                        venues={venues}
                        selectedVenue={selectedVenue}
                        onVenueSelect={(venueId) => {
                          setSelectedVenue(venueId)
                          setSuggestedVenue(venues.find(v => v.id === venueId) || null)
                        }}
                        deliveryAddress={deliveryAddress}
                        onAddressChange={setDeliveryAddress}
                        onAddressSelect={(address) => {
                          setDeliveryAddress(address)
                          // Auto-select closest venue logic is handled in the map component
                        }}
                        isGeocodingAddress={isGeocodingAddress}
                      />
                      
                      {/* Auto-selection info */}
                      {suggestedVenue && (
                        <div className="bg-[#f8f68f]/10 border border-[#f8f68f]/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-[#f8f68f]" />
                            <span className="text-white text-sm">
                              Auto-selected nearest YOLK: <strong>{suggestedVenue.name}</strong>
                            </span>
                          </div>
                    </div>
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
                {/* Auto-selected venue summary (when skipping steps) */}
                {selectedVenue && (
                  <div className="bg-[#f8f68f]/10 border border-[#f8f68f]/30 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-[#f8f68f]" />
                      <div>
                        <h4 className="text-white font-medium text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          {deliveryType === "delivery" ? "Delivery from" : "Collection from"}: YOLK {venues.find(v => v.id === selectedVenue)?.name}
                        </h4>
                        <p className="text-gray-300 text-sm">
                          {venues.find(v => v.id === selectedVenue)?.address}
                        </p>
                        {deliveryType === "delivery" && deliveryAddress && (
                          <p className="text-gray-300 text-sm mt-1">
                            <strong>Delivery to:</strong> {deliveryAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                 <div className="grid grid-cols-2 gap-4">
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
                     <h4 className="text-white font-medium text-2xl uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
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
            <div className="flex gap-4 pt-6 border-t border-zinc-800 flex-shrink-0">
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
                  src="/yolk-black.svg" 
                  alt="YOLK" 
                  className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setCurrentView("hero")}
                />
              </div>
              
              {/* Navigation Items */}
              <div className="flex items-center space-x-6 text-xl">
              {isManager && (
                <button 
                  onClick={() => {
                    document.getElementById('order-section')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    })
                  }}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  ORDER
                </button>
              )}
                <a href="#" className="text-black hover:text-gray-700 font-medium" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  LOCATIONS
                </a>
                <button 
                onClick={() => {
                  if (isTeamMemberMode && groupOrderId) {
                    document.getElementById('menu-section')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    })
                  } else {
                    setCurrentView("menu")
                  }
                }}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  MENUS
                </button>
              {user && isManager && (
                <button 
                  onClick={() => window.location.href = '/orders'}
                  className="text-black hover:text-gray-700 font-medium" 
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  MY ORDERS
                </button>
              )}
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
            
            {/* Order Info Display */}
            {isManager && selectedVenue && selectedTime && (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={startOrderFlow}
                  className="flex items-center space-x-4 bg-black/10 px-4 py-2 rounded-lg hover:bg-black/20 transition-colors cursor-pointer"
                  title="Click to change order details"
                >
                  {/* Budget display for team members */}
                  {isTeamMemberMode && individualBudget && (
                    <>
                      <div className="w-px h-4 bg-black/20"></div>
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-6 w-6 text-black" />
                        <div className="flex items-center space-x-2">
                          <span className="text-black font-bold text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                            £{groupOrders.find(order => order.personName === "You")?.totalSpent || 0}
                          </span>
                          <span className="text-black opacity-60 text-xl">/</span>
                          <span className="text-black font-bold text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                            £{individualBudget}
                          </span>
                          <span className={`text-lg font-bold ${
                            (() => {
                              const remaining = Math.max(0, Number(individualBudget) - (groupOrders.find(order => order.personName === "You")?.totalSpent || 0))
                              const percentage = (remaining / Number(individualBudget)) * 100
                              if (percentage <= 10) return 'text-red-600'
                              if (percentage <= 25) return 'text-orange-600'
                              return 'text-black opacity-70'
                            })()
                          }`} style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                            (£{Math.max(0, Number(individualBudget) - (groupOrders.find(order => order.personName === "You")?.totalSpent || 0))} left)
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </button>

                {/* Cart Button */}
                {isTeamMemberMode ? (
                  // Team member cart button
                  (() => {
                    const userOrder = groupOrders.find(order => order.personName === "You")
                    const userItemCount = userOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
                    return userItemCount > 0 ? (
                      <Button
                        onClick={() => window.location.href = `/cart?group-order=${groupOrderId}`}
                        className="bg-black text-[#f8f68f] hover:bg-gray-800 relative shadow-lg font-medium uppercase text-lg px-4 py-2"
                        style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        My Order ({userItemCount})
                        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                          {userItemCount}
                        </Badge>
                      </Button>
                    ) : null
                  })()
                ) : isManager && (
                  // Standard cart button for managers only
                  getTotalItems() > 0 && (
                  <Button
                    onClick={() => window.location.href = '/cart'}
                    className="bg-black text-[#f8f68f] hover:bg-gray-800 relative shadow-lg font-medium uppercase text-lg px-4 py-2"
                    style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart ({getTotalItems()})
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                      {getTotalItems()}
                    </Badge>
                  </Button>
                  )
                )}
              </div>
            )}

            {/* Sign Out Button - Always show when signed in */}
            {user && (
              <div className="flex items-center ml-4">
                <Button
                  onClick={async () => {
                    await signOut()
                    setCurrentView("hero")
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
            {!user && !loading && (
              <Button
                onClick={() => window.location.href = '/auth/signin'}
                className="bg-black text-[#f8f68f] hover:bg-gray-800 font-medium text-sm"
              >
                Log in
              </Button>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            )}
          </div>
        </div>
      </nav>
      
      <AnimatePresence mode="wait">
        {currentView === "hero" && (
          <div className="min-h-[110vh] md:min-h-[130vh] relative overflow-hidden">
            {/* Hero Background Image */}
            <div className="absolute inset-0">
              <img 
                src="/yolk-banner.png" 
                alt="YOLK Restaurant" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Hero Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center pt-[10rem]">
              <div className="max-w-7xl mx-auto px-6">

                
                {isTeamMemberMode && groupOrderId ? (
                  // Team Member Hero - Custom for group order participants
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    
                    {/* Left Side - Group Order Info */}
                    <motion.div
                      key="team-hero-content"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.8 }}
                      className="text-white space-y-8"
                    >
                      <div className="space-y-6">
                        <Badge className="bg-[#f8f68f] text-black px-4 py-2 text-sm font-medium uppercase tracking-wider">
                          Group Order
                        </Badge>
                        <h1 className="text-5xl lg:text-6xl font-bold leading-tight uppercase" style={{ fontFamily: 'alternate-gothic-atf, serif' }}>
                          Your Team's
                          <span className="block text-[#f8f68f]">Order Awaits.</span>
                        </h1>
                        <p className="text-xl text-zinc-100 leading-relaxed max-w-lg">
                          You've been invited to join a group order! Choose your items within your budget and we'll handle the rest.
                        </p>
                      </div>

                      {/* Order Details Card */}
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-100 text-lg">Restaurant:</span>
                            <span className="text-white font-medium text-2xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              YOLK {venues.find(v => v.id === selectedVenue)?.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-10 text-lg">Date & time:</span>
                            <span className="text-white font-medium text-2xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
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
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-100 text-lg">Your budget:</span>
                            <span className="text-[#f8f68f] font-bold text-2xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                              £{individualBudget}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                          onClick={() => {
                            document.getElementById('menu-section')?.scrollIntoView({ 
                              behavior: 'smooth' 
                            })
                          }}
                          className="bg-[#f8f68f] text-black hover:bg-[#f8ffff] px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase shadow-2xl transform hover:scale-105"
                          style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                        >
                          Start Ordering
                          <ArrowRight className="ml-2 h-6 w-6" />
                        </Button>
                        <Button
                          onClick={() => {
                            // Exit group order
                            const url = new URL(window.location.href)
                            url.searchParams.delete('group-order')
                            window.history.replaceState({}, '', url.toString())
                            setIsGroupOrderMode(false)
                            setIsTeamMemberMode(false)
                            setGroupOrderId("")
                            setGroupOrderUrl("")
                          }}
                          variant="outline"
                          className="text-white hover:bg-zinc-700 hover:text-white px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase"
                          style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                        >
                          Exit Order
                        </Button>
                      </div>
                    </motion.div>

                    {/* Right Side - How It Works */}
                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="space-y-6"
                    >
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-[#f8f68f] p-3 rounded-full">
                            <CheckCircle className="h-6 w-6 text-black" />
                          </div>
                          <h3 className="text-xl font-bold uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                            YOLK YES!
                          </h3>
                        </div>
                        <p className="text-zinc-100 text-sm leading-relaxed">
                          Next-level sandwiches for next-level occasions. Premium catering with fresh ingredients, creative combinations, and exceptional service. No more sad desk salads!
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-[#f8f68f] p-3 rounded-full">
                            <ShoppingCart className="h-6 w-6 text-black" />
                          </div>
                          <h3 className="text-xl font-bold uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                            How It Works
                          </h3>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start space-x-3">
                            <div className="bg-[#f8f68f] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              1
                            </div>
                            <p className="text-zinc-200">Browse our menu and add items to your order</p>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="bg-[#f8f68f] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              2
                            </div>
                            <p className="text-zinc-200">Stay within your £{individualBudget} budget limit</p>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="bg-[#f8f68f] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              3
                            </div>
                            <p className="text-zinc-200">Review and confirm your order</p>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="bg-[#f8f68f] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              4
                            </div>
                            <p className="text-zinc-200">Your team manager will finalize the group order</p>
                          </div>
                        </div>
                      </div>


                    </motion.div>
                  </div>
                ) : (
                  // Standard Hero - For managers and regular users
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  
                  {/* Left Side - Main Content */}
                  <motion.div
                    key="hero-content"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.8 }}
                    className="text-white space-y-8"
                  >
                    <div className="space-y-4">
                      <Badge className="bg-[#000000] text-white px-4 py-2 text-sm font-medium uppercase tracking-wider">
                        Group orders
                      </Badge>
                      <h1 className="lg:text-6xl xl:text-7xl text-6xl font-bold leading-tight uppercase" style={{ fontFamily: 'alternate-gothic-atf, serif' }}>
                        Next-level
                        <span className="block text-[#f8f68f]">sandwiches</span>
                          for any occasion.
                      </h1>
                      <p className="text-xl text-zinc-100 leading-relaxed max-w-lg">
                        Because your office deserves better than bland. Group orders with flexible invoicing and VIP service for verified partners.
                      </p>
                    </div>

                                          <div className="flex flex-col sm:flex-row gap-4">
                        {isManager ? (
                          <>
                        <Button
                          onClick={() => {
                            document.getElementById('order-section')?.scrollIntoView({ 
                              behavior: 'smooth' 
                            })
                          }}
                          className="bg-[#f8f68f] text-black hover:bg-[#f8ffff] px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase shadow-2xl transform hover:scale-105"
                          style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                        >
                          Start Group Order
                          <ArrowRight className="ml-2 h-6 w-6" />
                        </Button>
                      <Button
                        onClick={() => setCurrentView("apply")}
                        variant="outline"
                        className="text-white hover:bg-zinc-700 hover:text-white px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase"
                        style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                      >
                        Become Partner
                      </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => window.location.href = '/auth/signin'}
                              className="bg-[#f8f68f] text-black hover:bg-[#f8ffff] px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase shadow-2xl transform hover:scale-105"
                              style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                            >
                              Log in
                              <ArrowRight className="ml-2 h-6 w-6" />
                            </Button>
                            <Button
                              onClick={() => setCurrentView("apply")}
                              variant="outline"
                              className="text-white hover:bg-zinc-700 hover:text-white px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase"
                              style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                            >
                              Become Partner
                            </Button>
                          </>
                        )}
                    </div>

                  </motion.div>

                  {/* Right Side - Features Grid */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="grid grid-cols-2 lg:grid-cols-1 gap-6"
                  >
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-[#f8f68f] p-3 rounded-full">
                          <Users className="h-6 w-6 text-black" />
                        </div>
                        <h3 className="text-xl font-bold uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Group Orders
                        </h3>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        Let each team member choose their own items or order for the whole team. Flexible ordering for any group size.
                      </p>
                    </div>


                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-[#f8f68f] p-3 rounded-full">
                          <FileText className="h-6 w-6 text-black" />
                        </div>
                        <h3 className="text-xl font-bold uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Flexible Billing
                        </h3>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        Pay now with card or apply for 30-day invoice terms. No prepayment needed - we trust our partners.
                      </p>
                    </div>
                  </motion.div>
                </div>
                )}
              </div>
            </div>

            {/* Scroll Indicator - Only for standard hero */}
            {!isTeamMemberMode && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="flex flex-col items-center space-y-2 text-white"
              >
                <span className="text-sm font-medium uppercase tracking-wider">Scroll to explore</span>
                <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
                  <motion.div
                    animate={{ y: [0, 12, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1 h-3 bg-white rounded-full mt-2"
                  />
                </div>
              </motion.div>
            </div>
            )}
          </div>
        )}

        {/* Order Section - Only visible when NOT in group order mode */}
        {!isGroupOrderMode && (
          <section id="order-section" className="min-h-screen bg-white py-20">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="bg-[#f8f68f] text-black px-4 py-2 text-sm font-medium uppercase tracking-wider mb-6">
                Get Started
              </Badge>
              <h2 className="text-4xl lg:text-6xl font-bold text-black mb-6 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                Ready to Order?
              </h2>
              <p className="text-xl text-zinc-700 max-w-2xl mx-auto">
                Choose your delivery method, select your venue, and start building your perfect group order.
              </p>
            </motion.div>

            {/* Find Your YOLK - Full Width Above */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <div className="bg-zinc-100/50 border border-zinc-100 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-black mb-6 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  Find nearest YOLK
                </h3>
                <GoogleMapComponent
                  venues={venues}
                  selectedVenue={selectedVenue}
                  onVenueSelect={setSelectedVenue}
                  deliveryAddress={deliveryAddress}
                  onAddressChange={setDeliveryAddress}
                  onAddressSelect={(address) => {
                    setDeliveryAddress(address)
                    // Auto-select closest venue logic is handled in the map component
                  }}
                  isGeocodingAddress={isGeocodingAddress}
                />
              </div>
            </motion.div>

            {/* Order Steps - Split into Two Columns */}
            <div className="space-y-8 pt-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
                {/* Left Column - Steps 1-2 */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-[#f8f68f] text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-black mb-2 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Choose Delivery
                        </h3>
                        <p className="text-zinc-600">
                          Pick between delivered catering or click & collect from any of our London locations.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-[#f8f68f] text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-black mb-2 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Select Venue & Time
                        </h3>
                        <p className="text-zinc-600">
                          Choose your preferred location and schedule your order for 3+ days ahead.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Column - Steps 3-4 */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-[#f8f68f] text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-black mb-2 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Build Your Order
                        </h3>
                        <p className="text-zinc-600">
                          Browse our curated menu and add items to your cart. Standard orders or individual choice for teams.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-[#f8f68f] text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-black mb-2 uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                          Checkout & Pay
                        </h3>
                        <p className="text-zinc-600">
                          Review your order, choose payment method, and confirm. We'll handle the rest!
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

                            {/* Start Your Order Button - Centered on Separate Row */}
              <div className="flex justify-center">
                <Button
                  onClick={startOrderFlow}
                  className="bg-[#f8f68f] text-black hover:bg-[#e6e346] px-8 py-6 text-xl font-bold rounded-full transition-all duration-300 uppercase shadow-2xl transform hover:scale-105"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Start Your Order
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>

            </div>
          </div>
        </section>
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

        {/* Menu Section - Always visible when in team member mode, or when menu view is active (but not when in cart) */}
        {((isTeamMemberMode && groupOrderId) || currentView === "menu") && currentView !== "cart" && (
          <section id="menu-section" className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8 pt-10">
                <div>
                  <h1 className="text-4xl font-light text-black mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>Menu</h1>
                  <p className="text-zinc-700">Curated selections for large groups.</p>
                </div>
                {!isTeamMemberMode && (
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
                )}
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
                    <Card className="bg-zinc-100/50 border-zinc-100 hover:border-zinc-200 transition-all duration-300 overflow-hidden group cursor-pointer">
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
                        <h3 className="text-2xl uppercase font-medium text-black mb-2" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>{item.name}</h3>
                        <p className="text-zinc-700 text-sm mb-4 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-light text-black">£{item.price}</span>
                          {(() => {
                            // Check if item is affordable for team members
                            if (isTeamMemberMode && individualBudget) {
                              const currentSpending = groupOrders.find(order => order.personName === "You")?.totalSpent || 0
                              const remainingBudget = Number(individualBudget) - currentSpending
                              const isAffordable = remainingBudget >= item.price
                              
                              return (
                          <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isAffordable) {
                                      openProductModal(item)
                                    } else {
                                      alert(`Sorry! This item costs £${item.price} but you only have £${remainingBudget.toFixed(2)} remaining in your budget.`)
                                    }
                                  }}
                                  size="sm"
                                  className={`rounded-full transition-transform ${
                                    isAffordable 
                                      ? 'bg-black text-white hover:bg-zinc-800' 
                                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  }`}
                                  disabled={!isAffordable}
                                >
                                  <Plus className="h-6 w-6" />
                                </Button>
                              )
                            } else {
                              return (
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
                              )
                            }
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
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

                {/* Budget warning for team members */}
                {isTeamMemberMode && individualBudget && (() => {
                  const currentSpending = groupOrders.find(order => order.personName === "You")?.totalSpent || 0
                  const totalCost = selectedProduct.price * modalQuantity
                  const remainingBudget = Number(individualBudget) - currentSpending
                  const isOverBudget = remainingBudget < totalCost
                  
                  return isOverBudget ? (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <X className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 text-sm">
                          This would exceed your budget by £{(totalCost - remainingBudget).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Continue Button */}
                <Button
                  onClick={addToCartFromModal}
                  className={`w-full font-bold uppercase text-xl py-3 shadow-lg ${
                    isTeamMemberMode && individualBudget && (() => {
                      const currentSpending = groupOrders.find(order => order.personName === "You")?.totalSpent || 0
                      const totalCost = selectedProduct.price * modalQuantity
                      const remainingBudget = Number(individualBudget) - currentSpending
                      return remainingBudget < totalCost
                    })()
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-[#f8f68f] text-black hover:from-[#e6e346] hover:to-[#d4d123]'
                  }`}
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                  disabled={isTeamMemberMode && individualBudget ? (() => {
                    const currentSpending = groupOrders.find(order => order.personName === "You")?.totalSpent || 0
                    const totalCost = selectedProduct.price * modalQuantity
                    const remainingBudget = Number(individualBudget) - currentSpending
                    return remainingBudget < totalCost
                  })() : false}
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
