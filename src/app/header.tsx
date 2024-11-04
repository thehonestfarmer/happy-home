
"use client"

import Link from "next/link"

export default function Header() {

  return (
      <header className="bg-primary text-primary-foreground py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" prefetch={false}>
          <h1 className="text-2xl font-bold">Happy Home</h1>
          </Link>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link href="#" prefetch={false}>
                  Listings
                </Link>
              </li>
              {/* <li>
                <Link href="#" prefetch={false}>
                  Agents
                </Link>
              </li> */}
              <li>
                <Link href="#" prefetch={false}>
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
  )
}
