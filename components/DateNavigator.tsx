"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateNavigatorProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  type: "day" | "week";
  weekNumber?: number;
  onWeekChange?: (weekNumber: number) => void;
}

export default function DateNavigator({
  currentDate,
  onDateChange,
  type,
  weekNumber,
  onWeekChange,
}: DateNavigatorProps) {
  const handlePrevious = () => {
    if (type === "week" && onWeekChange && weekNumber !== undefined) {
      onWeekChange(weekNumber - 1);
    } else {
      const date = new Date(currentDate + "T00:00:00");
      if (type === "day") {
        date.setDate(date.getDate() - 1);
      } else {
        date.setDate(date.getDate() - 7);
      }
      onDateChange(date.toISOString().split("T")[0]);
    }
  };

  const handleNext = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    if (type === "week" && onWeekChange && weekNumber !== undefined) {
      const date = new Date(currentDate + "T00:00:00");
      const nextWeekDate = new Date(date);
      nextWeekDate.setDate(date.getDate() + 7);
      const nextWeekStr = nextWeekDate.toISOString().split("T")[0];

      if (nextWeekStr <= todayStr) {
        onWeekChange(weekNumber + 1);
      }
    } else {
      const date = new Date(currentDate + "T00:00:00");
      const nextDate = new Date(date);
      if (type === "day") {
        nextDate.setDate(date.getDate() + 1);
      } else {
        nextDate.setDate(date.getDate() + 7);
      }
      const nextDateStr = nextDate.toISOString().split("T")[0];

      if (nextDateStr <= todayStr) {
        onDateChange(nextDateStr);
      }
    }
  };

  const getWeekDateRange = () => {
    const date = new Date(currentDate + "T00:00:00");
    const dayOfWeek = date.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysSinceMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
    };
    const mondayStr = monday.toLocaleDateString("es-ES", dateOptions);
    const sundayStr = sunday.toLocaleDateString("es-ES", dateOptions);

    return `${mondayStr} - ${sundayStr}`;
  };

  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    if (type === "day") {
      return currentDate === todayStr;
    } else {
      // For week type, check if today falls within the current week
      const date = new Date(currentDate + "T00:00:00");
      const dayOfWeek = date.getDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(date);
      monday.setDate(date.getDate() - daysSinceMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return today >= monday && today <= sunday;
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg p-3">
      <button
        onClick={handlePrevious}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        title={type === "day" ? "Día anterior" : "Semana anterior"}
      >
        <ChevronLeft size={20} />
        <span>{type === "day" ? "Día Anterior" : "Semana Anterior"}</span>
      </button>

      <div className="flex flex-col items-center min-w-[250px]">
        <span className="text-lg font-semibold text-gray-800">
          {type === "day"
            ? new Date(currentDate + "T00:00:00").toLocaleDateString("es-ES", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : getWeekDateRange()}
        </span>
      </div>

      {!isToday() && (
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          title={type === "day" ? "Día siguiente" : "Semana siguiente"}
        >
          <span>{type === "day" ? "Día Siguiente" : "Semana Siguiente"}</span>
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
