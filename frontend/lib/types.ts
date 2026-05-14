export type OptionChoice = {
  id: string
  label: string
  priceDelta: number
}

export type OptionGroup = {
  id: string
  name: string
  required: boolean
  choices: OptionChoice[]
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
  optionGroups: OptionGroup[]
}

export type CartItem = {
  lineId: string
  menuItemId: string
  name: string
  basePrice: number
  quantity: number
  selectedOptions: { groupId: string; groupName: string; choiceId: string; choiceLabel: string; priceDelta: number }[]
  unitPrice: number
}

export type BillStatus = "open" | "processing" | "paid"

export type Bill = {
  id: string
  tableNumber: string
  items: CartItem[]
  total: number
  status: BillStatus
  createdAt: number
  paidAt?: number
}
