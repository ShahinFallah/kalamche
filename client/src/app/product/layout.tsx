import Footer from "@/components/layout/Footer"
import { Navbar, NavLink } from "@/components/layout/Navbar"
import { navLinks } from "@/data/navLinks"

const ProductLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Navbar>
        {navLinks.map((nav) => (
          <NavLink key={nav.href} href={nav.href}>
            {nav.text}
          </NavLink>
        ))}
      </Navbar>
      <div className="container mx-auto py-8">{children}</div>
      <Footer />
    </>
  )
}
export default ProductLayout
