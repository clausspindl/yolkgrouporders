"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, Users, CreditCard, ShoppingCart, Plus, X } from "lucide-react"
import { supabase, type RealtimeGroupOrder, type RealtimeGroupOrderItem } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

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

interface GroupOrderDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  groupOrder: RealtimeGroupOrder | null
}

interface LocalGroupOrder {
  id: string
  personName: string
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    category: string
    image: string
    quantity: number
  }>
  totalSpent: number
  timestamp: Date
}

export default function GroupOrderDashboardModal({ 
  isOpen, 
  onClose, 
  groupOrder 
}: GroupOrderDashboardModalProps) {
  const { toast } = useToast()
  const [groupOrders, setGroupOrders] = useState<LocalGroupOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [individualBudget, setIndividualBudget] = useState("25")
  const [teamSize, setTeamSize] = useState("10")
  const [orderDeadline, setOrderDeadline] = useState("")

  useEffect(() => {
    if (groupOrder) {
      setIndividualBudget(groupOrder.budget.toString())
      setTeamSize(groupOrder.team_size.toString())
      setOrderDeadline(groupOrder.deadline || "")
      loadGroupOrderItems()
      
      // Set up real-time subscription for group order items
      const setupRealtimeSubscription = async () => {
        console.log('Setting up real-time subscription for group order:', groupOrder.id)
        
        const subscription = supabase
          .channel(`group-order-items-${groupOrder.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'group_order_items',
              filter: `group_order_id=eq.${groupOrder.id}`
            },
            (payload) => {
              console.log('Real-time update received:', payload)
              // Refresh the data when any change occurs
              loadGroupOrderItems()
            }
          )
          .subscribe()

        return () => {
          console.log('Cleaning up real-time subscription')
          subscription.unsubscribe()
        }
      }

      const cleanup = setupRealtimeSubscription()
      
      // Fallback: refresh every 5 seconds in case real-time doesn't work
      const intervalId = setInterval(() => {
        console.log('Fallback refresh of group order items')
        loadGroupOrderItems()
      }, 5000)
      
      return () => {
        cleanup.then(unsubscribe => unsubscribe())
        clearInterval(intervalId)
      }
    }
  }, [groupOrder])

  const loadGroupOrderItems = async () => {
    if (!groupOrder) return
    
    setLoading(true)
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('group_order_items')
        .select('*')
        .eq('group_order_id', groupOrder.id)
        .order('created_at', { ascending: true })

      if (itemsError) {
        console.error('Error loading group order items:', itemsError)
      } else {
        console.log('Loaded items:', itemsData)
        const transformedOrders = transformSupabaseItemsToLocalFormat(itemsData)
        setGroupOrders(transformedOrders)
      }
    } catch (error) {
      console.error('Error loading group order items:', error)
    } finally {
      setLoading(false)
    }
  }

  const transformSupabaseItemsToLocalFormat = (items: RealtimeGroupOrderItem[]): LocalGroupOrder[] => {
    const ordersMap = new Map<string, LocalGroupOrder>()
    
    items.forEach(item => {
      if (!ordersMap.has(item.person_name)) {
        ordersMap.set(item.person_name, {
          id: item.person_name,
          personName: item.person_name,
          items: [],
          totalSpent: 0,
          timestamp: new Date(item.created_at)
        })
      }
      
      const order = ordersMap.get(item.person_name)!
      const existingItem = order.items.find(i => i.id === item.product_id)
      
      if (existingItem) {
        existingItem.quantity += item.quantity
      } else {
                 order.items.push({
           id: item.product_id,
           name: item.product_name,
           description: item.product_description || "",
           price: item.product_price,
           category: item.product_category || "",
           image: item.product_image || "",
           quantity: item.quantity
         })
       }
       
       order.totalSpent += item.product_price * item.quantity
    })
    
    return Array.from(ordersMap.values())
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

  const generateGroupOrderUrl = (orderId: string): string => {
    return `${window.location.origin}?group-order=${orderId}`
  }

  const getTotalGroupSpending = (orders: LocalGroupOrder[]) => {
    return orders.reduce((total, order) => total + order.totalSpent, 0)
  }

  const getRemainingGroupBudget = (budget: number, teamSize: number) => {
    const totalBudget = budget * teamSize
    const spent = getTotalGroupSpending(groupOrders)
    return totalBudget - spent
  }

  const updateGroupOrderDetails = async (updates: Partial<RealtimeGroupOrder>) => {
    if (!groupOrder) return
    
    try {
      const { error } = await supabase
        .from('group_orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupOrder.id)

      if (error) {
        console.error('Error updating group order:', error)
        toast({
          title: "Error",
          description: "Failed to update order details",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: "Order details updated successfully!",
        })
      }
    } catch (error) {
      console.error('Error updating group order:', error)
      toast({
        title: "Error",
        description: "Failed to update order details",
        variant: "destructive"
      })
    }
  }

  const finalizeGroupOrder = async () => {
    if (!groupOrder) return
    
    try {
      const { error } = await supabase
        .from('group_orders')
        .update({
          status: 'waiting_for_payment',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupOrder.id)

      if (error) {
        console.error('Error finalizing group order:', error)
        toast({
          title: "Error",
          description: "Failed to finalize order",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: "Order finalized! Ready for payment.",
        })
        // Update the local group order status
        groupOrder.status = 'waiting_for_payment'
        // Close the modal after a short delay
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (error) {
      console.error('Error finalizing group order:', error)
      toast({
        title: "Error",
        description: "Failed to finalize order",
        variant: "destructive"
      })
    }
  }

  if (!groupOrder) return null

  const groupOrderUrl = generateGroupOrderUrl(groupOrder.id)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white [&>button]:hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-center space-x-4 mt-2">
          <Badge className={`text-xs ${
            groupOrder.status === 'draft' 
              ? 'bg-blue-600 text-white' 
              : groupOrder.status === 'waiting_for_payment'
              ? 'bg-orange-500 text-white'
              : 'bg-green-500 text-white'
          }`}>
            {groupOrder.status === 'draft' ? 'DRAFT' : 
             groupOrder.status === 'waiting_for_payment' ? 'WAITING FOR PAYMENT' : 
             'FINALIZED'}
          </Badge>
        </div>
        
                  <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl font-light text-white uppercase text-center" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
              {groupOrder.status === 'finalized' ? 'Order Details' : 'Order overview'}
            </DialogTitle>
            <CardDescription className="text-gray-400 text-center">
              {groupOrder.status === 'finalized' ? 'Finalized order information' : 'Share the link below with your team'}
            </CardDescription>
          </DialogHeader>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Shareable Link Section - Only for non-finalized orders */}
            {groupOrder.status !== 'finalized' && (
              <Card className="bg-[#f8f68f]/10 border-[#f8f68f]/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Link className="h-5 w-5 text-[#f8f68f]" />
                    <span className="text-white font-medium text-lg" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
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
                    <Button
                      onClick={loadGroupOrderItems}
                      variant="outline"
                      className="border-zinc-700 text-white hover:bg-zinc-800"
                      title="Refresh group orders manually"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Refreshing...</span>
                        </div>
                      ) : (
                        "Refresh Orders"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                <p className="text-white font-bold text-xl">£{Number(individualBudget) * Number(teamSize)}</p>
                <p className="text-gray-400 text-sm">Total Budget</p>
              </CardContent>
            </Card>
                      </div>

            {/* Order Details - Show for all statuses */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Venue Information */}
                <div className="space-y-2">
                  <Label className="text-white">Venue</Label>
                  <div className="bg-black/30 border border-zinc-600 rounded p-3">
                    <p className="text-white font-medium">
                      YOLK {venues.find(v => v.id === groupOrder.venue)?.name || 'Unknown Venue'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {venues.find(v => v.id === groupOrder.venue)?.address || 'Address not available'}
                    </p>
                  </div>
                </div>

                {/* Delivery Type */}
                <div className="space-y-2">
                  <Label className="text-white">Delivery Type</Label>
                  <div className="bg-black/30 border border-zinc-600 rounded p-3">
                    <p className="text-white font-medium">
                      {groupOrder.delivery_type === 'delivery' ? 'Delivery' : 'Collection'}
                    </p>
                    {groupOrder.delivery_type === 'collection' && (
                      <p className="text-gray-400 text-sm mt-1">
                        Pickup from venue
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Address - Show if it exists */}
                {groupOrder.delivery_address && groupOrder.delivery_address.trim() !== "" && (
                  <div className="space-y-2">
                    <Label className="text-white">Delivery Address</Label>
                    <div className="bg-black/30 border border-zinc-600 rounded p-3">
                      <p className="text-white font-medium">
                        {groupOrder.delivery_address}
                      </p>
                    </div>
                  </div>
                )}
                


                {/* Date and Time */}
                {groupOrder.time && (
                  <div className="space-y-2">
                    <Label className="text-white">Date & Time</Label>
                    <div className="bg-black/30 border border-zinc-600 rounded p-3">
                      <p className="text-white font-medium">
                        {new Date(groupOrder.time).toLocaleDateString('en-GB', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {new Date(groupOrder.time).toLocaleTimeString('en-GB', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Method - Only show for finalized orders */}
                {groupOrder.status === 'finalized' && (
                  <div className="space-y-2">
                    <Label className="text-white">Payment Method</Label>
                    <div className="bg-black/30 border border-zinc-600 rounded p-3">
                      <p className="text-white font-medium">
                        {groupOrder.payment_method === 'invoice' ? 'Invoice (30 days)' : 'Card Payment'}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Payment completed
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details Editor (Manager Only) */}
          {groupOrder.status === 'draft' && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                  Edit Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <Button
                  onClick={() => updateGroupOrderDetails({
                    budget: Number(individualBudget),
                    team_size: Number(teamSize),
                    deadline: orderDeadline
                  })}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Update Order Details
                </Button>
              </CardContent>
            </Card>
          )}

                      {/* Group Order Cart */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white uppercase" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                    Group Order Cart
                  </CardTitle>
                  {groupOrder.status !== 'finalized' && (
                    <Button
                      onClick={() => {
                        onClose()
                        window.location.href = `/?group-order=${groupOrder.id}&manager=true`
                      }}
                      className="bg-[#f8f68f] text-black hover:bg-[#e6e346] uppercase text-lg"
                      style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Items
                    </Button>
                  )}
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
                    const allItems: { [key: string]: any } = {}
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
                          <h3 className="text-white font-medium text-xl" style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}>
                            {item.name}
                          </h3>
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
            <div className="flex gap-4 pt-6 border-t border-zinc-800 flex-shrink-0">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 uppercase text-lg"
                style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
              >
                Close
              </Button>
              {groupOrder.status === 'draft' && (
                <Button
                  onClick={finalizeGroupOrder}
                  disabled={groupOrders.length === 0}
                  className="flex-1 bg-[#f8f68f] text-black hover:bg-[#e6e346] uppercase text-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Finalize Order ({groupOrders.length > 0 ? `${groupOrders.length} people` : 'Empty'})
                </Button>
              )}
              {groupOrder.status === 'waiting_for_payment' && (
                <Button
                  onClick={() => {
                    onClose()
                    // Navigate to dedicated cart page
                    window.location.href = `/cart?group-order=${groupOrder.id}`
                  }}
                  className="flex-1 bg-[#f8f68f] text-black hover:bg-zinc-300 uppercase text-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Proceed to Payment
                </Button>
              )}
              {groupOrder.status === 'finalized' && (
                <Button
                  onClick={onClose}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700 uppercase text-lg"
                  style={{ fontFamily: '"alternate-gothic-atf", sans-serif' }}
                >
                  Order Complete
                </Button>
              )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 