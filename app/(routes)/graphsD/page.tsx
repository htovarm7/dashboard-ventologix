  /*
  * @file page.tsx
  * @date 23/04/2025
  * @author Hector Tovar
  * 
  * @description
  * This file implements the daily graphs, including a Line Chart and a Gauge Chart using both Chart.js and ECharts.
  *
  * @version 1.0
  */

  "use client" 

  // Components from anothers files
  import TransitionPage from "@/components/transition-page";
  import NavBar from "@/components/navBar";

  import React, { useEffect, useState } from 'react';
  import { useRouter } from "next/router";
  import DatePicker from "react-datepicker";
  import "react-datepicker/dist/react-datepicker.css";

  // Libraries for charts
  import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement} from "chart.js";
  import { Pie, Chart} from "react-chartjs-2";

  // ECharts for the gauge chart
  import ReactECharts from 'echarts-for-react';

  // Register the necessary components for Chart.js
  ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

  export default function Main() {

    // Constant Declarations
    const [chartData, setChartData] = useState([0, 0, 0]); // default values
    const [lineChartData, setLineChartData] = useState<number[]>([]); // default values
    const [lineChartLabels, setLineChartLabels] = useState<string[]>([]); // default labels
    const [maxData, setMaxData] = useState(0); // default max value
    const [gaugeValue, setGaugeValue] = useState<number>(0);
    const [kWh, setKWh] = useState<number>(0); // default kWh value
    const [hoursWorked, setHoursWorked] = useState<number>(0); // default hours worked value
    const [usdCost, setUsdCost] = useState<number>(0); // default USD cost value
    const [Load, setLoad] = useState<number>(0); // default load values
    const [NoLoad, setNoLoad] = useState<number>(0); // default no load values
    const [Off, setOff] = useState<number>(0); // default off values
    const [firstHour, setFirstHour] = useState("");
    const [lastHour, setLastHour] = useState("");
    const [totalCiclos, setTotalCiclos] = useState(0);
    const [promedioCiclosHora, setPromedioCiclosHora] = useState(0);
    const [comentarioCiclos, setComentarioCiclos] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [hpNominal, setHPNominal] = useState<number>(0);
    const [hpeq, setHPEquivalente] = useState<number>(0);
    const [comentarioHp, setComentarioHp] = useState("");

    const [clientData, setClientData] = useState<{
      numero_cliente: number;
      nombre_cliente: string;
      RFC: string;
      direccion: string;
    } | null>(null);

    const [compressorData, setCompresorData] = useState<{
      hp: number;
      tipo: string;
      voltaje: number;
      marca: string;
      numero_serie: number;
      alias: string;
    } | null>(null);

    const id_cliente = localStorage.getItem("id_cliente");

    useEffect(() => {
      const fetchAllData = async () => {
        try {
          const [pieRes, lineRes, commentsRes, statsRes, clientRes, compressorRes] = await Promise.all([
            (async () => { 
              const res = await fetch(`http://127.0.0.1:8000/web/pie-data-proc?id_cliente=${id_cliente}`); 
              return res.json(); 
            })(),
            (async () => { 
              const res = await fetch(`http://127.0.0.1:8000/web/line-data-proc?id_cliente=${id_cliente}`); 
              return res.json(); 
            })(),
            (async () => { 
              const res = await fetch(`http://127.0.0.1:8000/web/comments-data?id_cliente=${id_cliente}`); 
              return res.json(); 
            })(),
            (async () => { 
              const res = await fetch(`http://127.0.0.1:8000/web/stats-data?id_cliente=${id_cliente}`); 
              return res.json(); 
            })(),
            (async () => { 
              const res = await fetch(`http://127.0.0.1:8000/web/client-data?id_cliente=${id_cliente}`); 
              return res.json(); 
            })(),
            (async () => { 
              const res = await fetch(`http://127.0.0.1:8000/web/compressor-data?id_cliente=${id_cliente}`); 
              return res.json(); 
            })(),
          ]);

          if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
          if (compressorRes.data.length > 0) setCompresorData(compressorRes.data[0]);

          const stats = statsRes.data;
          setKWh(stats.kWh);
          setHoursWorked(stats.hours_worked);
          setUsdCost(stats.usd_cost);
          setHPNominal(stats.hp_nominal);
          setHPEquivalente(stats.hp_equivalente);
          setComentarioHp(stats.comentario_hp_equivalente);

          const comments = commentsRes.data;
          setFirstHour(comments.first_time);
          setLastHour(comments.last_time);
          setTotalCiclos(comments.total_ciclos);
          setPromedioCiclosHora(comments.promedio_ciclos_hora);
          setComentarioCiclos(comments.comentario_ciclos);

          const { LOAD, NOLOAD, OFF } = pieRes.data;
          setChartData([LOAD, NOLOAD, OFF]);

          setLoad(LOAD);
          setNoLoad(NOLOAD);
          setOff(OFF);

          const rawData = lineRes.data.map((item) => ({
            time: new Date(item.time),
            corriente: item.corriente,
          }));
          rawData.sort((a, b) => a.time.getTime() - b.time.getTime());

          const times = rawData.map(item =>
            item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          const currents = rawData.map(item => item.corriente);

          if (!times.includes("23:59:59")) {
            times.push("23:59:59");
            currents.push(null);
          }

          setLineChartLabels(times);
          setLineChartData(currents);
          setMaxData(Math.max(...currents.filter(c => c !== null)) * 1.3);

        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };

      fetchAllData();
    }, [id_cliente]);

    const handleDownload = async () => {
      const response = await fetch("http://localhost:8000/web/raw-data-excel");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "raw_data.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    };

  
  const hp_instalado = hpNominal
  const hp_equivalente = hpeq;
  const porcentajeUso = (hp_equivalente / hp_instalado) * 100;
  
  const option = {
    series: [
      {
        type: "gauge",
        startAngle: 205,
        endAngle: -25,
        min: 30,
        max: 120,
        splitNumber: 9,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.377, "red"],
              [0.544, "yellow"],
              [0.689, "green"],
              [0.766, "#418FDE"],
              [0.889, "yellow"],
              [1, "red"],
            ],
          },
        },
        pointer: {
          show: true,
          length: "80%",
          width: 5,
        },
        axisTick: {
          distance: -35,
          length: 8,
          lineStyle: {
            color: "#fff",
            width: 1,
          },
        },
        splitLine: {
          distance: -40,
          length: 10,
          lineStyle: {
            color: "#fff",
            width: 2,
          },
        },
        axisLabel: {
          distance: -50,
          color: "#000",
          fontSize: 14,
        },
        detail: {
          valueAnimation: true,
          fontSize: 22,
          offsetCenter: [0, "60%"],
          formatter: `{value}%`,
          color: (() => {
            if (porcentajeUso <= 64) return "red";
            if (porcentajeUso <= 79) return "black";
            if (porcentajeUso <= 92) return "green";
            if (porcentajeUso <= 99) return "#418FDE";
            if (porcentajeUso <= 110) return "black";
            if (porcentajeUso <= 120) return "red";
            return "black";
          })(),
        },
        data: [
          {
            value: porcentajeUso.toFixed(0),
          },
        ],
      },
    ],
  };
    
  const dataPie = {
    labels: ["LOAD", "NO LOAD", "OFF"], // Etiquetas para las secciones del gráfico
    datasets: [
      {
        label: "Estados del Compresor", // Título del gráfico
        data: chartData, // Los datos que provienen del backend
        backgroundColor: [
          "rgb(0, 191, 255)", // Color para "LOAD"
          "rgb(229, 255, 0)", // Color para "NO LOAD"
          "rgb(126, 126, 126)", // Color para "OFF"
        ],
        hoverOffset: 30, // Efecto al pasar el mouse
      },
    ],
    options: {
      layout: {
        padding: 20,
      },
      responsive: true,
      maintainAspectRatio: false, // Muy útil si le defines height/width al canvas contenedor
      cutout: '0%',
    }
  };

  // Line boundaries options
  const lineChartOptions = {
    responsive: true,
    scales: {
      y: {
        min: 0, // Lower boundary of the Y-axis
        max: maxData, // Upper boundary of the Y-axis
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const dataLine = {
    labels: lineChartLabels, // Labels for the X-axis of the line chart
    datasets: [
      {
        label: 'Corriente consumida en el dia', // Title of the dataset
        data: lineChartData, // Data points for the line chart
        borderColor: 'rgb(13, 9, 255)', // Line color
        backgroundColor: 'rgba(82, 94, 255, 0.2)', // Area fill color
        fill: 'origin', // Fill from the origin of the Y-axis
        tension: 0.4, // Line smoothing
        pointBackgroundColor: 'rgb(13, 9, 255)', // Color of the data points
        pointRadius: 1, // Radius of the data points
        borderWidth: 1, // Width of the line
      }
    ],
  };

    useEffect(() => {
      setTimeout(() => {
        const ready = document.createElement('div');
        ready.id = 'grafico-listo';
        document.body.appendChild(ready);

        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const fechaAyer = ayer.toISOString().split('T')[0];

        fetch('http://localhost:8000/api/generar_pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cliente: id_cliente,
            fecha: fechaAyer,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log('Respuesta del backend:', data);
          })
          .catch((error) => {
            console.error('Error al notificar al backend:', error);
          });
      }, 2000);
    }, []);

    const router = useRouter();
    const { id_cliente } = router.query;

    const [datos, setDatos] = useState(null);

    useEffect(() => {
      if (id_cliente) {
        fetch(`/api/reportes/${id_cliente}`)
          .then(res => res.json())
          .then(data => setDatos(data));
      }
    }, [id_cliente]);


    return (
      
      <main>
        <TransitionPage />
        <NavBar />

        {/* Here its the top section*/}
        <div className="flex flex-col items-center mb-3">
          <h1 className="text-3xl font-bold text-center">Reporte Diario</h1>
          <h2 className="text-2xl font-bold text-center">{compressorData?.alias}</h2>
          <h3 className="text-xl font-bold text-center">Fecha: {new Date(new Date().setDate(new Date().getDate())).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
          <img src="/Ventologix_04.png" alt="logo" className="h-16 w-auto mt-3 absolute top-0 left-0 m-3" />
        </div> 

        <div className="mt-4 p-4">

          <h2 className="text-xl font-bold mb-2 p-15">Información Compresor</h2>
          <div className="flex flex-wrap gap-60 items-center justify-center text-center">
            <div className="text-center">
              <p className="text-xl ">{compressorData?.numero_serie}</p>
              <p className="text-lg font-bold">Número de Serie</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{compressorData?.marca}</p>
              <p className="text-lg font-bold">Marca</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{compressorData?.tipo}</p>
              <p className="text-lg font-bold">Tipo</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{compressorData?.voltaje}</p>
              <p className="text-lg font-bold">Voltaje</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{compressorData?.hp}</p>
              <p className="text-lg font-bold">HP</p>
            </div>
          </div>

          {/* Informaion del clinte */}
          <h2 className="text-xl font-bold mb-2 p-15"> Informacion del Cliente </h2>
          <div className="flex flex-wrap gap-60 items-center justify-center text-center">
            <div className="text-center">
              <p className="text-xl">{clientData?.nombre_cliente}</p>
              <p className="text-lg font-bold">Nombre</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{clientData?.numero_cliente}</p>
              <p className="text-lg font-bold">Número de Cliente</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{clientData?.RFC}</p>
              <p className="text-lg font-bold">RFC</p>
            </div>
            <div className="text-center">
              <p className="text-xl">{clientData?.direccion}</p>
              <p className="text-lg font-bold">Direccion</p>
            </div>
          </div>
        </div>
        
        {/* Here its the graphs */}
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

        <div className="flex justify-center mt-4 gap-10 items-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Recargar Página
          </button>
          <button
            onClick={handleDownload}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Descargar Raw Data
          </button>
          
          <div className="relative">
            <h2 className="text-center font-bold text-blue-600 animate-bounce"> Elige una fecha</h2>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date as Date)}
              dateFormat="dd-MM-yyyy"
              className="py-2 px-4 text-center font-bold border border-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute top-2 right-2 text-gray-400">
              <i className="fas fa-calendar-alt"></i>
            </span>
          </div>
        </div>

          {/* KPIs */}
          <div className="flex flex-row gap-8">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-sm text-black">Gasto USD*</h2>
              <p className="text-3xl font-bold text-black">${usdCost.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-sm text-black">kWh Utilizados</h2>
              <p className="text-3xl font-bold text-black">{kWh.toFixed(0)} kWh</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
            <h2 className="text-sm text-black">Horas Trabajadas</h2>
            <p className="text-3xl font-bold text-black">{hoursWorked.toFixed(1)} h</p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="flex flex-row flex-wrap justify-center gap-4">
          <div className="bg-white rounded-s shadow p-4 w-[300] h-[300] flex flex-col items-center justify-center">
            <h3 className="text-center text-black mb-2">Estados del Compresor</h3>
            <Pie data={dataPie} />
          </div>

          <div className="bg-white rounded-2xl shadow p-4 w-[650px] h-[400px] flex flex-col">
            <h3 className="text-center text-black mb-2">Corriente consumida en el día</h3>
            <Chart type="line" data={dataLine} options={lineChartOptions} />
          </div>

          <div className="bg-white rounded-2xl shadow p-4 w-[280px] h-[280px] items-center justify-center">
            <h2 style={{ textAlign: "center" }}><strong>Hp Equivalente:</strong> {hp_equivalente} Hp</h2>
            <h2 style={{ textAlign: "center" }}><strong>Hp Instalado:</strong> {hp_instalado} Hp</h2>
            <ReactECharts
              option={option}
              style={{ height: "350px", width: "100%" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
        </div>

        <div className="gap-10 items-left justify-left text-left">
        <h1 className="text-3xl font-bold">Comentarios</h1>

        <p className="text-lg text-left">
          • El día de ayer <strong>({new Date(new Date().setDate(new Date().getDate())).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})</strong> se iniciaron labores a las <strong>{firstHour}</strong> y se concluyeron a las <strong>{lastHour}</strong>
        </p>

        <p className="text-lg text-left mt-2">
          • Entre las horas de <strong>{firstHour}</strong> y <strong>{lastHour}</strong>, el compresor operó de la siguiente manera:
        </p>

        <ul className="list-disc ml-8 text-lg text-left">
          <li><strong>LOAD:</strong> {Load}%</li>
          <li><strong>NO LOAD:</strong> {NoLoad}%</li>
          <li><strong>OFF:</strong> {Off}%</li>
        </ul>

        <p className="text-lg text-left mt-2">
          • Durante el día se completaron un total de <strong>{totalCiclos}</strong> ciclos de trabajo. Un ciclo se define como un cambio desde el estado <strong>LOAD</strong> a <strong>NO LOAD</strong> consecutivamente.
        </p>
        
        <p className="text-lg text-left mt-2">
          • El promedio de ciclos por hora trabajada fue de <strong>{promedioCiclosHora}</strong> ciclos/hora.
        </p>

        <p className="text-lg text-left mt-2">
          • El costo total de operación del compresor fue de <strong>${usdCost.toFixed(2)}</strong>.
        </p>

        <p className="text-lg text-left mt-2">
          • {comentarioCiclos}
        </p>
        
        <p className="text-lg text-left mt-2">
          • No se detectaron consumos con valores fuera de lo común.
        </p>

        <p className="text-lg text-left mt-2">
          • {comentarioHp}
        </p>

        <p className="text-sm text-left mt-2">
          • El costo por kilovatio-hora (kWh) utilizado en este análisis es de <strong>$0.17 USD/kWh</strong>, que es el estándar actualmente aplicado. Sin embargo, si requiere confirmar este valor o necesita ajustar la tarifa, puede verificar con su contacto en <strong>VENTOLOGIX</strong>
        </p>

        <h1 className="text-xl text-left mt-7 font-bold">IQgineer VENTOLOGIX asignado:</h1>
        <p className="text-xl text-left mt-2" ><strong>Nombre:</strong> Ing. Andrés Mirazo</p>
        <p className="text-xl text-left mt-2"><strong>Teléfono:</strong> 81 8477 7023</p>
        <p className="text-xl text-left mt-2">
        <strong>Correo:</strong>{" "}
        <a
          href="mailto:Andres.Mirazo@ventologix.com"
          className="text-blue-600 hover:scale-120 hover:text-blue-800  duration-300"
        >
          Andres.Mirazo@ventologix.com
        </a>
      </p>
      </div>
      
      </div>
      </main>
    );
  }