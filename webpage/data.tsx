import { HomeIcon, UserRound } from "lucide-react";

export const itemsNavbar = [
    {
        id: 1,
        title: "Diario",
        icon: <HomeIcon size={25} color="#fff" strokeWidth={1} />,
        link: "/graphsD",
    },
    {
        id: 2,
        title: "Semanal",
        icon: <UserRound size={25} color="#fff" strokeWidth={1} />,
        link: "/graphsW",
    },
];