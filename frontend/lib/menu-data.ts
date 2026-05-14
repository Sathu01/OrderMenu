import type { MenuItem } from "./types"

export const CATEGORIES = ["Beverage", "Snack"] as const

export const INITIAL_MENU: MenuItem[] = [
  {
    id: "m1",
    name: "Grilled Salmon",
    description: "Atlantic salmon, lemon butter, seasonal greens.",
    price: 22.0,
    category: "Mains",
    image: "/grilled-salmon-plated.jpg",
    available: true,
    optionGroups: [
      {
        id: "size",
        name: "Portion",
        required: true,
        choices: [
          { id: "reg", label: "Regular", priceDelta: 0 },
          { id: "lg", label: "Large", priceDelta: 4 },
        ],
      },
      {
        id: "addons",
        name: "Add-ons",
        required: false,
        choices: [
          { id: "rice", label: "Side rice", priceDelta: 2 },
          { id: "salad", label: "Side salad", priceDelta: 3 },
        ],
      },
    ],
  },
  {
    id: "m2",
    name: "Truffle Pasta",
    description: "Fresh tagliatelle, black truffle, parmesan.",
    price: 18.5,
    category: "Mains",
    image: "/truffle-pasta-bowl.jpg",
    available: true,
    optionGroups: [
      {
        id: "size",
        name: "Portion",
        required: true,
        choices: [
          { id: "reg", label: "Regular", priceDelta: 0 },
          { id: "lg", label: "Large", priceDelta: 4 },
        ],
      },
    ],
  },
  {
    id: "m3",
    name: "Ribeye Steak",
    description: "300g grain-fed ribeye, peppercorn jus.",
    price: 32.0,
    category: "Mains",
    image: "/ribeye-steak-plate.jpg",
    available: true,
    optionGroups: [
      {
        id: "cook",
        name: "Cooked",
        required: true,
        choices: [
          { id: "rare", label: "Rare", priceDelta: 0 },
          { id: "med", label: "Medium", priceDelta: 0 },
          { id: "well", label: "Well done", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "m4",
    name: "Crispy Fries",
    description: "Hand-cut potatoes, sea salt, aioli.",
    price: 6.0,
    category: "Sides",
    image: "/crispy-french-fries-aioli.jpg",
    available: true,
    optionGroups: [],
  },
  {
    id: "m5",
    name: "Garden Salad",
    description: "Mixed greens, vinaigrette, shaved parmesan.",
    price: 8.5,
    category: "Sides",
    image: "/fresh-garden-salad.jpg",
    available: true,
    optionGroups: [],
  },
  {
    id: "m6",
    name: "Iced Latte",
    description: "Double shot espresso, milk, ice.",
    price: 5.0,
    category: "Drinks",
    image: "/iced-latte-glass.jpg",
    available: true,
    optionGroups: [
      {
        id: "milk",
        name: "Milk",
        required: true,
        choices: [
          { id: "whole", label: "Whole", priceDelta: 0 },
          { id: "oat", label: "Oat", priceDelta: 0.75 },
          { id: "almond", label: "Almond", priceDelta: 0.75 },
        ],
      },
    ],
  },
  {
    id: "m7",
    name: "Fresh Lemonade",
    description: "Squeezed lemon, mint, sparkling water.",
    price: 4.5,
    category: "Drinks",
    image: "/lemonade-with-mint.jpg",
    available: true,
    optionGroups: [],
  },
  {
    id: "m8",
    name: "Chocolate Lava",
    description: "Warm molten chocolate cake, vanilla ice cream.",
    price: 9.0,
    category: "Desserts",
    image: "/chocolate-lava-cake.png",
    available: true,
    optionGroups: [],
  },
]
