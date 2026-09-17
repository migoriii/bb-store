export type Product = {
  id: string
  name: string
  description: string
  category: 'Today' | 'Frozen Goods' | 'Rice' | 'Eggs'
  price: number
  stock: number
  unit: string
  available: boolean
  accent: 'lavender' | 'mint' | 'peach' | 'sky'
}

export const products: Product[] = [
  {
    id: 'today-1',
    name: 'Chicken Adobo',
    description: 'Today’s freshly prepared dish.',
    category: 'Today',
    price: 85,
    stock: 12,
    unit: 'serving',
    available: true,
    accent: 'peach',
  },
  {
    id: 'today-2',
    name: 'Pork Menudo',
    description: 'Today’s second meal option.',
    category: 'Today',
    price: 90,
    stock: 8,
    unit: 'serving',
    available: true,
    accent: 'lavender',
  },
  {
    id: 'frozen-1',
    name: 'Frozen Chicken',
    description: 'Frozen goods available for everyday shopping.',
    category: 'Frozen Goods',
    price: 250,
    stock: 10,
    unit: 'pack',
    available: true,
    accent: 'sky',
  },
  {
    id: 'rice-1',
    name: 'Rice',
    description: 'Sack of rice for your home.',
    category: 'Rice',
    price: 2300,
    stock: 5,
    unit: 'sack',
    available: true,
    accent: 'mint',
  },
  {
    id: 'eggs-1',
    name: 'Eggs',
    description: 'One dozen fresh eggs.',
    category: 'Eggs',
    price: 120,
    stock: 18,
    unit: 'dozen',
    available: true,
    accent: 'peach',
  },
]
