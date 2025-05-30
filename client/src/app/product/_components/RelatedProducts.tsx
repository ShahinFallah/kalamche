import ProductCard from "@/components/product/ProductCard"
import type { Product } from "@/types/product"

type RelatedProductsProps = {
  relatedProducts: Product[]
}

const RelatedProducts = ({ relatedProducts }: RelatedProductsProps) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Related Products
      </h2>
      <div className="grid gap-1 xs:gap-8 justify-center grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {relatedProducts.map((relatedProduct) => (
          <ProductCard
            className=""
            key={relatedProduct.id}
            product={relatedProduct}
          />
        ))}
      </div>
    </div>
  )
}
export default RelatedProducts
