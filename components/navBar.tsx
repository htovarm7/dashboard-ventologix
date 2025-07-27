"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";

import { itemsNavbar } from "@/data/items";

import MotionTransition  from "./transition-component";


const NavBar = () => {
    const router = usePathname();
    return ( 
        <MotionTransition position="right" className="fixed z-40 flex flex-col items-center justify-center w-full mt-auto h-max bottom-10">
            <nav>
                <div className="flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-blue-400 background-blur-sa">
                {itemsNavbar.map((item) => (
                    <div key={item.id}
                    className={`px-3 py-2 transition duration-150 
                        rounded-full cursor-pointer hover:scale-120 duration-400
                        ${router === item.link && 'bg-secondary'}`}
                            >
                            <Link href={item.link}>{item.text}</Link>
                    </div>
                ))}
                </div>
            </nav>
        </MotionTransition>
    );
}
 
export default NavBar;