"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Compressor } from "@/lib/types";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// Estilos personalizados para el calendario
const calendarStyles = `
  .react-calendar-custom {
    border: none !important;
    font-family: inherit;
    width: 100% !important;
    max-width: 280px;
    font-size: 12px;
  }
  .react-calendar-custom .react-calendar__tile {
    border-radius: 4px;
    transition: all 0.2s ease;
    padding: 6px 2px;
    font-size: 12px;
    cursor: pointer;
    height: 32px;
  }
  .react-calendar-custom .react-calendar__tile:hover {
    background-color: #dbeafe !important;
    color: #1d4ed8 !important;
  }
  .react-calendar-custom .react-calendar__tile--active {
    background-color: #2563eb !important;
    color: white !important;
  }
  .react-calendar-custom .react-calendar__tile--now {
    background-color: #fbbf24 !important;
    color: #78350f !important;
    font-weight: bold;
    border: 2px solid #f59e0b !important;
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.4) !important;
  }
  .react-calendar-custom .react-calendar__navigation button {
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    height: 36px;
  }
  .react-calendar-custom .react-calendar__navigation button:hover {
    background-color: #f3f4f6;
  }
  .react-calendar-custom .react-calendar__month-view__days__day--neighboringMonth {
    color: #d1d5db !important;
  }
  .react-calendar-custom .react-calendar__month-view__weekdays {
    font-size: 11px;
    font-weight: 600;
  }
  .react-calendar-custom .react-calendar__month-view__weekdays__weekday {
    padding: 4px;
  }
`;

interface DateReportDropdownProps {
  title: string;
  compresores: Compressor[];
  colorScheme: {
    text: string;
    icon: string;
    hover: string;
  };
  Rol?: number;
  selectedCompresor?: Compressor | null;
  tipo?: string;
}

const DateReportDropdown: React.FC<DateReportDropdownProps> = ({
  title,
  colorScheme,
  tipo,
  selectedCompresor = null,
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getToday = () => {
    const today = new Date();
    // Asegurar que usamos la fecha local, no UTC
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getTodayDate = () => {
    const today = new Date();
    // Crear una fecha local sin problemas de zona horaria
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [calendarValue, setCalendarValue] = useState<Value>(getTodayDate());
  const [showCalendar, setShowCalendar] = useState(false);

  // Close when tapping/clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (
        containerRef.current &&
        target &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
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

  function getWeeksInYear(year: number): number {
    const lastDay = new Date(year, 11, 31);
    const weekNum = getWeekNumber(lastDay);
    // If the last week belongs to next year, return 52, otherwise return the week number
    return weekNum === 1 ? 52 : weekNum;
  }

  function getWeekRange(weekNumber: number, year: number): { start: Date; end: Date } {
    const firstDayOfYear = new Date(year, 0, 1);
    const firstWeekDay = firstDayOfYear.getDay();

    const daysToAdd = (weekNumber - 1) * 7 - firstWeekDay + 1;
    const startDate = new Date(year, 0, 1 + daysToAdd);
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

    const dateToUse = getWeekRange(selectedWeek, selectedYear)
      .start.toISOString()
      .split("T")[0];

    sessionStorage.setItem(
      "selectedCompresor",
      JSON.stringify({
        id_cliente: selectedCompresor.id_cliente,
        linea: selectedCompresor.linea,
        alias: selectedCompresor.alias,
        date: dateToUse,
        weekNumber: selectedWeek,
        year: selectedYear,
      })
    );

    router.push("/graphsDateWeek");
  };

  const handleCalendarChange = (value: Value) => {
    if (value instanceof Date) {
      const dateString = value.toISOString().split("T")[0];
      setSelectedDate(dateString);
      setCalendarValue(value);
      setShowCalendar(false); // Cerrar calendario al seleccionar fecha

      // Immediately navigate when a date is clicked
      navigateToReport(dateString);
    }
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  const navigateToReport = (dateToUse?: string) => {
    const finalDate = dateToUse || selectedDate;

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
        date: finalDate,
      })
    );

    router.push("/graphsDateDay");
  };

  return (
    <>
      <style jsx>{calendarStyles}</style>
      <div ref={containerRef} className="relative text-center group">
        <h2
          tabIndex={0}
          role="button"
          aria-expanded={isOpen}
          className={`text-2xl ${colorScheme.text} hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2`}
          onClick={() => {
            setIsOpen((s) => !s);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen((s) => !s);
            }
          }}
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
          <div
            className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 sm:w-80 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl transition-all duration-300 z-10 ${
              isOpen ? "opacity-100 visible" : "opacity-0 invisible"
            } group-hover:opacity-100 group-hover:visible`}
          >
            <div className="py-2">
              {tipo === "DIARIO" && (
                <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center">
                  <label className="block text-xl font-medium text-gray-700 mb-3 text-center">
                    📅 Seleccionar Fecha:
                  </label>

                  {/* Botón para mostrar/ocultar calendario */}
                  <button
                    onClick={toggleCalendar}
                    className="w-full max-w-xs px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center flex items-center justify-between"
                  >
                    <span className="text-blue-700 font-medium">
                      {selectedDate}
                    </span>
                    <svg
                      className={`w-5 h-5 text-blue-500 transform transition-transform ${
                        showCalendar ? "rotate-180" : ""
                      }`}
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
                  </button>

                  {/* Calendario de React - Solo se muestra cuando showCalendar es true */}
                  {showCalendar && (
                    <div className="mt-3 border rounded-md p-2 bg-white shadow-lg">
                      <Calendar
                        onChange={handleCalendarChange}
                        value={calendarValue}
                        maxDate={getTodayDate()}
                        className="react-calendar-custom"
                        locale="es-ES"
                        showNeighboringMonth={false}
                        next2Label={null}
                        prev2Label={null}
                      />
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mt-3 text-center">
                    {showCalendar
                      ? "Haz click en una fecha para ver el reporte automáticamente"
                      : "Haz click arriba para abrir el calendario"}
                  </p>
                </div>
              )}{" "}
              {tipo === "SEMANAL" && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center">
                    <label className="block text-xl font-medium text-gray-700 mb-3 text-center">
                      📅 Seleccionar Año y Semana:
                    </label>
                    
                    {/* Year Selector */}
                    <div className="mb-4 w-full max-w-xs">
                      <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
                        Año:
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const newYear = parseInt(e.target.value);
                          setSelectedYear(newYear);
                          // Reset week to 1 when changing year
                          setSelectedWeek(1);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-semibold cursor-pointer hover:bg-purple-50 transition-colors"
                      >
                        {/* Generate years from 2023 to current year */}
                        {Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i).map(year => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Week Selector */}
                    <div className="w-full max-w-xs">
                      <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
                        Semana:
                      </label>
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          value={selectedWeek}
                          onChange={(e) => {
                            const maxWeeks = selectedYear === currentYear 
                              ? currentWeek 
                              : getWeeksInYear(selectedYear);
                            setSelectedWeek(
                              Math.min(
                                Math.max(1, parseInt(e.target.value) || 1),
                                maxWeeks
                              )
                            );
                          }}
                          className="text-xl w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-semibold cursor-pointer hover:bg-purple-50 transition-colors"
                          min="1"
                          max={selectedYear === currentYear ? currentWeek : getWeeksInYear(selectedYear)}
                        />
                        <span className="text-gray-700 text-xl">
                          / {selectedYear === currentYear ? currentWeek : getWeeksInYear(selectedYear)}
                        </span>
                      </div>
                    </div>
                    
                    {selectedWeek && (
                      <div className="mt-3 text-base text-gray-600 font-medium text-center">
                        {formatDateSpanish(getWeekRange(selectedWeek, selectedYear).start)} -{" "}
                        {formatDateSpanish(getWeekRange(selectedWeek, selectedYear).end)}
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
                        Semana {selectedWeek} - {selectedYear}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DateReportDropdown;
