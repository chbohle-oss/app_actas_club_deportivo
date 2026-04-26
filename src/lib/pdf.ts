// PDF generation for formal actas
// Uses jsPDF for client-side generation (works offline)

interface ActaPDFData {
  clubNombre: string;
  numero: number;
  anio: number;
  titulo: string;
  fecha: string;
  lugar: string;
  tipoReunion: string;
  asistentes: Array<{ nombre: string; presente: boolean }>;
  temas: string[];
  acuerdos: Array<{
    titulo: string;
    descripcion?: string;
    responsable?: string;
    fechaCompromiso?: string;
    estado: string;
  }>;
  proximaReunion?: string;
  aprobaciones: Array<{ nombre: string; decision: string; fecha: string }>;
}

export function generateActaPDFContent(data: ActaPDFData): string {
  // Generate HTML content for the formal acta view (also used for print)
  const presentes = data.asistentes.filter(a => a.presente);
  const ausentes = data.asistentes.filter(a => !a.presente);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #1a1a1a;
          padding: 40px 60px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #f97316;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .club-name {
          font-size: 18pt;
          font-weight: bold;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .acta-number {
          font-size: 14pt;
          color: #f97316;
          font-weight: bold;
          margin-top: 8px;
        }
        .acta-title {
          font-size: 13pt;
          margin-top: 6px;
          color: #555;
        }
        .meta-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
          font-size: 11pt;
          color: #555;
        }
        h2 {
          font-size: 13pt;
          color: #1a1a1a;
          border-bottom: 1px solid #ddd;
          padding-bottom: 6px;
          margin: 24px 0 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .attendees {
          columns: 2;
          column-gap: 20px;
        }
        .attendee {
          font-size: 11pt;
          padding: 2px 0;
        }
        .present { color: #16a34a; }
        .absent { color: #dc2626; }
        .topics li {
          margin-left: 20px;
          margin-bottom: 6px;
          font-size: 11pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10pt;
        }
        th {
          background: #f5f5f5;
          border: 1px solid #ddd;
          padding: 8px 10px;
          text-align: left;
          font-weight: bold;
        }
        td {
          border: 1px solid #ddd;
          padding: 6px 10px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: bold;
        }
        .badge-pendiente { background: #dbeafe; color: #1d4ed8; }
        .badge-en-curso { background: #fef3c7; color: #92400e; }
        .badge-hecho { background: #dcfce7; color: #166534; }
        .signatures {
          margin-top: 40px;
          display: flex;
          flex-wrap: wrap;
          gap: 30px;
        }
        .signature-box {
          flex: 1;
          min-width: 200px;
          text-align: center;
          padding-top: 40px;
          border-top: 1px solid #1a1a1a;
          font-size: 10pt;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 9pt;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 12px;
        }
        @media print {
          body { padding: 20px 40px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="club-name">🏀 ${data.clubNombre}</div>
        <div class="acta-number">ACTA Nº ${data.numero}/${data.anio}</div>
        <div class="acta-title">${data.titulo}</div>
      </div>

      <div class="meta-info">
        <span>📅 ${data.fecha}</span>
        <span>📍 ${data.lugar}</span>
        <span>📋 ${data.tipoReunion}</span>
      </div>

      <h2>👥 Asistentes</h2>
      <div class="attendees">
        ${presentes.map(a => `<div class="attendee present">✓ ${a.nombre}</div>`).join('')}
        ${ausentes.map(a => `<div class="attendee absent">✗ ${a.nombre} (ausente)</div>`).join('')}
      </div>

      ${data.temas.length > 0 ? `
        <h2>📌 Temas Tratados</h2>
        <ol class="topics">
          ${data.temas.map(t => `<li>${t}</li>`).join('')}
        </ol>
      ` : ''}

      ${data.acuerdos.length > 0 ? `
        <h2>🤝 Acuerdos</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Acuerdo</th>
              <th>Responsable</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.acuerdos.map((a, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <strong>${a.titulo}</strong>
                  ${a.descripcion ? `<br><small>${a.descripcion}</small>` : ''}
                </td>
                <td>${a.responsable || '—'}</td>
                <td>${a.fechaCompromiso || '—'}</td>
                <td><span class="badge badge-${a.estado.toLowerCase().replace('_', '-')}">${a.estado}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${data.proximaReunion ? `
        <h2>📆 Próxima Reunión</h2>
        <p>${data.proximaReunion}</p>
      ` : ''}

      ${data.aprobaciones.length > 0 ? `
        <h2>✍️ Aprobaciones</h2>
        <div class="signatures">
          ${data.aprobaciones.map(a => `
            <div class="signature-box">
              <div>${a.decision === 'APRUEBA' ? '✅' : '❌'} ${a.decision}</div>
              <div><strong>${a.nombre}</strong></div>
              <div><small>${a.fecha}</small></div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        Documento generado por ActasClub Basket • ${new Date().toLocaleDateString('es-CL')}
      </div>
    </body>
    </html>
  `;
}
