"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compresor } from "@/types/common";

interface DateReportDropdownProps {
  title: string;
  compresores: Compresor[];
  colorScheme: {
    text: string;
    icon: string;
    hover: string;
  };
  Rol?: number;
  selectedCompresor?: Compresor | null;
  tipo?: string;
}

const DateReportDropdown: React.FC<DateReportDropdownProps> = ({
  title,
  colorScheme,
  tipo,
  selectedCompresor = null,
}) => {
  const router = useRouter();

  const getYesterday = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState(getYesterday());

  const currentWeek = getWeekNumber(new Date()) - 1;
  const [selectedWeek, setSelectedWeek] = useState<number>(
    Math.min(currentWeek, getWeekNumber(new Date()))
  );

  function getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  function getWeekRange(weekNumber: number): { start: Date; end: Date } {
    const currentYear = new Date().getFullYear();
    const firstDayOfYear = new Date(currentYear, 0, 1);
    const firstWeekDay = firstDayOfYear.getDay();

    const daysToAdd = (weekNumber - 1) * 7 - firstWeekDay + 1;
    const startDate = new Date(currentYear, 0, 1 + daysToAdd);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return { start: startDate, end: endDate };
  }

  function formatDateSpanish(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("es-ES", options);
  }

  const handleDateSelect = () => {
    if (!selectedCompresor) {
      alert("No hay compresor seleccionado");
      return;
    }

    const dateToUse =
      tipo === "SEMANAL"
        ? getWeekRange(selectedWeek).start.toISOString().split("T")[0]
        : selectedDate;

    sessionStorage.setItem(
      "selectedCompresor",
      JSON.stringify({
        id_cliente: selectedCompresor.id_cliente,
        linea: selectedCompresor.linea,
        alias: selectedCompresor.alias,
        date: dateToUse,
        weekNumber: tipo === "SEMANAL" ? selectedWeek : undefined,
      })
    );
    if (tipo === "DIARIO") {
      router.push("/graphsDateDay");
    }
    if (tipo === "SEMANAL") {
      router.push("/graphsDateWeek");
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);

    if (!selectedCompresor) {
      alert("No hay compresor seleccionado");
      return;
    }

    sessionStorage.setItem(
      "selectedCompresor",
      JSON.stringify({
        id_cliente: selectedCompresor.id_cliente,
        linea: selectedCompresor.linea,
        alias: selectedCompresor.alias,
        date: newDate,
      })
    );

    setTimeout(() => {
      router.push("/graphsDateDay");
    }, 300);
  };

  return (
    <div className="relative text-center group">
      <h2
        className={`text-2xl ${colorScheme.text} hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2`}
      >
        {title}
        <svg
          className={`w-4 h-4 ${colorScheme.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </h2>

      {selectedCompresor && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 sm:w-80 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
          <div className="py-2">
            {tipo === "DIARIO" && (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center">
                  <label className="block text-xl font-medium text-gray-700 mb-2 text-center">
                    📅 Seleccionar Fecha:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="text-l w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center cursor-pointer hover:bg-blue-50 transition-colors"
                    max={getYesterday()}
                    title="Haz click para seleccionar fecha y navegar automáticamente"
                  />
                </div>

                <div className="px-4 py-3">
                  <button
                    onClick={handleDateSelect}
                    className={`w-full px-4 py-2 text-white bg-gray-500 hover:bg-gray-600 rounded-md transition-colors font-medium text-m opacity-75`}
                  >
                    Navegar Manualmente <br />
                    <span className="text-sm">({selectedDate})</span>
                  </button>
                </div>
              </>
            )}

            {tipo === "SEMANAL" && (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center">
                  <label className="block text-xl font-medium text-gray-700 mb-2 text-center">
                    📅 Seleccionar Semana:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={selectedWeek}
                      onChange={(e) =>
                        setSelectedWeek(
                          Math.min(
                            Math.max(1, parseInt(e.target.value)),
                            currentWeek
                          )
                        )
                      }
                      className="text-xl w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-semibold cursor-pointer hover:bg-blue-50 transition-colors"
                      min="1"
                      max={currentWeek}
                    />
                    <span className="text-gray-700 text-xl">
                      / {currentWeek}
                    </span>
                  </div>
                  {selectedWeek && (
                    <div className="mt-2 text-base text-gray-600 font-medium">
                      {formatDateSpanish(getWeekRange(selectedWeek).start)} -{" "}
                      {formatDateSpanish(getWeekRange(selectedWeek).end)}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3">
                  <button
                    onClick={handleDateSelect}
                    className={`w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors font-medium text-m`}
                  >
                    Ver Reporte Semanal <br />
                    <span className="text-xl font-bold">
                      Semana {selectedWeek}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateReportDropdown;
