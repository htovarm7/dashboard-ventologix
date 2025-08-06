// Utility functions for API calculations

interface DataRecord {
  time: Date | string;
  estado?: string;
  estado_anterior?: string;
  corriente?: number;
}

// Calculate percentage of LOAD records
export function percentageLoad(data: DataRecord[]): number {
  if (data.length === 0) return 0;
  const loadRecords = data.filter(record => record.estado === "LOAD");
  return (loadRecords.length / data.length) * 100;
}

// Calculate percentage of NOLOAD records
export function percentageNoload(data: DataRecord[]): number {
  if (data.length === 0) return 0;
  const noloadRecords = data.filter(record => record.estado === "NOLOAD");
  return (noloadRecords.length / data.length) * 100;
}

// Calculate percentage of OFF records
export function percentageOff(data: DataRecord[]): number {
  if (data.length === 0) return 0;
  const offRecords = data.filter(record => record.estado === "OFF");
  return (offRecords.length / data.length) * 100;
}

// Calculate energy cost in USD
export function costoEnergiaUsd(kwhTotal: number, usdPorKwh: number): number {
  try {
    return Math.round(kwhTotal * usdPorKwh * 100) / 100;
  } catch (error) {
    console.error(`Error en costoEnergiaUsd: ${error}, kwhTotal=${kwhTotal}`);
    return 0.0;
  }
}

// Group data by time intervals and calculate averages
export function groupDataByInterval(data: DataRecord[], intervalSeconds: number = 30): Array<{time: string, corriente: number}> {
  if (data.length === 0) return [];
  
  // Sort data by time
  const sortedData = [...data].sort((a, b) => {
    const timeA = new Date(a.time);
    const timeB = new Date(b.time);
    return timeA.getTime() - timeB.getTime();
  });

  const groupedData: Array<{time: string, corriente: number}> = [];
  let tempData: DataRecord[] = [];
  let startTime = new Date(sortedData[0].time);

  for (const entry of sortedData) {
    const entryTime = new Date(entry.time);
    const timeDiff = (entryTime.getTime() - startTime.getTime()) / 1000; // Convert to seconds

    if (timeDiff >= intervalSeconds) {
      if (tempData.length > 0) {
        const avgCorriente = tempData.reduce((sum, item) => sum + (item.corriente || 0), 0) / tempData.length;
        groupedData.push({
          time: startTime.toISOString().slice(0, 19).replace('T', ' '),
          corriente: Math.round(avgCorriente * 100) / 100
        });
      }
      tempData = [entry];
      startTime = entryTime;
    } else {
      tempData.push(entry);
    }
  }

  // Add the last group
  if (tempData.length > 0) {
    const avgCorriente = tempData.reduce((sum, item) => sum + (item.corriente || 0), 0) / tempData.length;
    groupedData.push({
      time: startTime.toISOString().slice(0, 19).replace('T', ' '),
      corriente: Math.round(avgCorriente * 100) / 100
    });
  }

  return groupedData;
}
