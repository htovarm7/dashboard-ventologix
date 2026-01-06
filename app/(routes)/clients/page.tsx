"use client";

import { useEffect, useState } from "react";
import { clientData } from "@/lib/types";
import { URL_API } from "@/lib/global";

const ShowClients = () => {
  const [clients, setClients] = useState<clientData[]>([]);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${URL_API}/report/all-clients`);
      if (res.ok) {
        const clientsData = await res.json();
        setClients(clientsData);
      } else {
        console.error("Failed to fetch clients", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching clients", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="bg-white">
      <h1>Clients Page</h1>
      <div>
        {clients.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                {Object.keys(clients[0]).map((key) => (
                  <th
                    key={key}
                    className="border border-gray-300 p-2 text-left"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={index} className="hover:bg-gray-100">
                  {Object.values(client).map((value: any, i) => (
                    <td key={i} className="border border-gray-300 p-2">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No clients found or loading...</p>
        )}
      </div>
    </div>
  );
};

export default ShowClients;
