import { NextRequest, NextResponse } from 'next/server';

interface GeneratePDFRequest {
  id_cliente: number;
  linea: string;
  nombre_cliente: string;
  alias: string;
  tipo: "diario" | "semanal";
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePDFRequest = await request.json();
    const { id_cliente, linea, nombre_cliente, alias, tipo } = body;

    // Validate required fields
    if (!id_cliente || !linea || !nombre_cliente || !tipo) {
      return NextResponse.json(
        { detail: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    // Get the current date for the report
    const today = new Date();
    const fecha = tipo === "diario" 
      ? new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : today.toISOString().split("T")[0];

    // Make request to Python API server to generate PDF
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${pythonApiUrl}/report/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': process.env.NEXT_PUBLIC_API_SECRET || '',
      },
      body: JSON.stringify({
        id_cliente,
        linea,
        nombre_cliente,
        alias,
        tipo
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python API Error:', errorText);
      return NextResponse.json(
        { detail: `Error del servidor: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the PDF blob from Python API
    const pdfBuffer = await response.arrayBuffer();
    
    // Generate filename
    const aliasLimpio = (alias || '').trim();
    const nombreArchivo = `Reporte ${tipo === 'diario' ? 'Diario' : 'Semanal'} ${nombre_cliente} ${aliasLimpio} ${fecha}.pdf`;

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json(
      { detail: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}