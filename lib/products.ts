export type Product = {
  id: string
  name: string
  description: string
  category: string
  price: number
  stock: number | null
  unit: string
  available: boolean
  accent: 'lavender' | 'mint' | 'peach' | 'sky'
  image_url: string | null
}

export type SupabaseProduct = {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  stock_quantity: number | null
  is_available: boolean
  image_url: string | null
}

function getUnit(category: string) {
  switch (category) {
    case 'Today':
      return 'serving'
    case 'Frozen Goods':
      return 'pack'
    case 'Rice':
      return 'sack'
    case 'Eggs':
      return 'dozen'
    default:
      return 'item'
  }
}

function getAccent(category: string): Product['accent'] {
  switch (category) {
    case 'Frozen Goods':
      return 'sky'
    case 'Rice':
      return 'mint'
    case 'Eggs':
      return 'peach'
    case 'Other':
      return 'lavender'
    default:
      return 'peach'
  }
}

export function mapSupabaseProduct(
  row: SupabaseProduct,
): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    category: row.category,
    price: Number(row.price),
    stock: row.stock_quantity,
    unit: getUnit(row.category),
    available: row.is_available,
    accent: getAccent(row.category),
    image_url: row.image_url,
  }
}
