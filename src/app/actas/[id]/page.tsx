'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { generateActaPDFContent } from '@/lib/pdf';

interface Acta {
  id: string;
  numero: number;
  anio: number;
  titulo: string;
  estado: string;
  contenido: any;
  fechaReunion: string;
  lugarReunion: string;
  tipoReunion: string;
  proximaReunion?: string;
  creador: { nombre: string };
  acuerdos: Array<{
    id: string; 
    titulo: string; 
    descripcion: string; 
    responsable?: { nombre: string }; 
    fechaCompromiso?: string; 
    estado: string;
  }>;
  links?: Array<{ token: string }>;
  asistencias: Array<{ 
    usuario: { nombre: string; email: string; telefono?: string };
    presente: boolean;
  }>;
  aprobaciones: Array<{
    id: string;
    decision: string;
    fecha: string;
    usuario: { nombre: string };
  }>;
}

export default function ActaDetailPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const router = useRouter();
  const [acta, setActa] = useState<Acta | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActa = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/actas/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActa(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => { fetchActa(); }, [fetchActa]);

  const handleExportPDF = () => {
    if (!acta) return;
    try {
      const doc = new jsPDF();
      const primaryColor = [249, 115, 22]; // #f97316
      
      // --- HEADER ---
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`ActasClub Basket`, 105, 20, { align: 'center' });
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text(`ACTA Nº ${acta.numero}/${acta.anio}`, 105, 35, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(acta.titulo, 105, 43, { align: 'center' });

      // --- META INFO BOX ---
      doc.setFillColor(245, 245, 245);
      doc.rect(14, 50, 182, 25, 'F');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Fecha: ${new Date(acta.fechaReunion).toLocaleDateString('es-CL')}`, 20, 58);
      doc.text(`Lugar: ${acta.lugarReunion}`, 20, 65);
      doc.text(`Tipo: ${acta.tipoReunion}`, 120, 58);
      doc.text(`Estado: ${acta.estado}`, 120, 65);

      let currentY = 85;

      // --- ASISTENTES ---
      if (acta.asistencias && acta.asistencias.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Asistentes:', 14, currentY);
        currentY += 8;
        
        const presentes = acta.asistencias.filter(a => a.presente).map(a => `✓ ${a.usuario.nombre}`);
        const ausentes = acta.asistencias.filter(a => !a.presente).map(a => `✗ ${a.usuario.nombre} (Ausente)`);
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        // Split in two columns
        const allList = [...presentes, ...ausentes];
        const half = Math.ceil(allList.length / 2);
        for(let i = 0; i < half; i++) {
          doc.text(allList[i] || '', 20, currentY);
          if (allList[i + half]) {
            doc.text(allList[i + half], 110, currentY);
          }
          currentY += 6;
        }
        currentY += 10;
      }

      // --- TEMAS TRATADOS ---
      if (acta.contenido?.temas && acta.contenido.temas.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Temas Tratados:', 14, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        acta.contenido.temas.forEach((tema: string) => {
          // Wrap text to avoid overflow
          const splitTema = doc.splitTextToSize(`• ${tema}`, 170);
          doc.text(splitTema, 20, currentY);
          currentY += (splitTema.length * 6);
        });
        currentY += 5;
      }

      // --- ACUERDOS ---
      if (acta.acuerdos && acta.acuerdos.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Acuerdos Adoptados:', 14, currentY);
        
        const tableData = acta.acuerdos.map((a, i) => [
          (i + 1).toString(),
          a.titulo + (a.descripcion ? `\n${a.descripcion}` : ''),
          a.responsable?.nombre || '—',
          a.fechaCompromiso ? new Date(a.fechaCompromiso).toLocaleDateString('es-CL') : '—',
          a.estado
        ]);

        autoTable(doc, {
          startY: currentY + 4,
          head: [['#', 'Acuerdo', 'Responsable', 'Fecha', 'Estado']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 }
          }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- PRÓXIMA REUNIÓN ---
      if (acta.proximaReunion) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Próxima Reunión:', 14, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(acta.proximaReunion, 20, currentY);
        currentY += 15;
      }

      // --- FIRMAS / APROBACIONES ---
      if (acta.aprobaciones && acta.aprobaciones.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Aprobaciones y Firmas:', 14, currentY);
        currentY += 10;

        let sigX = 20;
        acta.aprobaciones.forEach((ap, index) => {
          if (sigX > 150) { // New row of signatures
            sigX = 20;
            currentY += 35;
          }
          
          doc.setDrawColor(200, 200, 200);
          doc.line(sigX, currentY, sigX + 60, currentY);
          
          doc.setFontSize(9);
          doc.text(ap.usuario.nombre, sigX + 30, currentY + 5, { align: 'center' });
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`Firmado: ${new Date(ap.fecha).toLocaleString('es-CL')}`, sigX + 30, currentY + 10, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          
          sigX += 75;
        });
      }

      // --- PAGINATION ---
      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        doc.text(`Doc ID: ${acta.id}`, 20, 285);
      }

      doc.save(`Acta_${acta.numero}_${acta.anio}.pdf`);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('Error al generar el PDF. Verifica la consola.');
    }
  };

  const openWhatsAppGroup = () => {
    const tokenToUse = acta?.links && acta.links[0]?.token;
    if (!tokenToUse) {
      alert('Aún no se ha generado un enlace de revisión. Haz clic en "Enviar a Revisión" primero.');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const urlConf = `${baseUrl}/compartido/${tokenToUse}`;
    
    let msg = `🏀 *ACTA EN REVISIÓN - ActasClub Basket*\n\n`;
    msg += `📋 *${acta?.titulo}*\n`;
    msg += `Acta Nº ${acta?.numero}/${acta?.anio}\n\n`;
    msg += `👉 Revisa el acta, comenta y aprueba aquí:\n${urlConf}\n`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
  };

  const handleSendToReview = async () => {
    if(!confirm('¿Generar el enlace oficial para enviar el acta a revisión?')) return;
    try {
      const res = await fetch(`/api/actas/${params.id}/enviar-revision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if(res.ok) {
        alert(data.message || 'Acta enviada a revisión exitosamente.');
        fetchActa();
      } else {
        alert(data.error || 'Hubo un error al enviar a revisión.');
      }
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) return <DashboardLayout><div className="loading-overlay"><div className="spinner" /></div></DashboardLayout>;
  if (!acta) return <DashboardLayout><div className="empty-state"><p>Acta no encontrada</p></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button onClick={() => router.push('/actas')} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-2)' }}>← Volver</button>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold' }}>{acta.titulo}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-1)' }}>
              <span className={`badge badge-${acta.estado.toLowerCase().replace('_', '-')}`}>{acta.estado}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>Acta Nº {acta.numero}/{acta.anio}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {acta.estado === 'BORRADOR' && (
              <button className="btn btn-primary" onClick={handleSendToReview}>
                📤 Enviar a Revisión
              </button>
            )}
            {acta.estado === 'EN_REVISION' && (
              <button className="btn btn-primary" onClick={openWhatsAppGroup}>
                📱 Compartir WhatsApp
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleExportPDF}>🖨️ Exportar PDF</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span>📅 Detalles de la Reunión</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div><p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Fecha y Hora</p><p>{new Date(acta.fechaReunion).toLocaleString('es-CL')}</p></div>
                <div><p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Lugar</p><p>{acta.lugarReunion}</p></div>
                <div><p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Tipo</p><p>{acta.tipoReunion}</p></div>
                <div><p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Responsable</p><p>{acta.creador.nombre}</p></div>
              </div>
            </div>

            {acta.contenido?.temas && (
              <div className="card">
                <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>📌 Temas Tratados</h2>
                <ul style={{ listStyle: 'none', padding: '0' }}>
                  {acta.contenido.temas.map((tema: string, i: number) => (
                    <li key={i} style={{ marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-4)', borderLeft: '3px solid var(--color-primary)' }}>
                      {tema}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {acta.acuerdos.length > 0 && (
              <div className="card">
                <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>🤝 Acuerdos</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {acta.acuerdos.map(a => (
                    <div key={a.id} style={{ background: 'var(--bg-input)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>{a.titulo}</strong>
                        <span className="badge badge-borrador" style={{ fontSize: '10px' }}>{a.estado}</span>
                      </div>
                      {a.descripcion && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{a.descripcion}</p>}
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {a.responsable && <span>👤 Resp: {a.responsable.nombre}</span>}
                        {a.fechaCompromiso && <span>📅 Fin: {new Date(a.fechaCompromiso).toLocaleDateString('es-CL')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="card">
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>✍️ Firmas ({acta.aprobaciones.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {acta.aprobaciones.map(ap => (
                  <div key={ap.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-success)' }}>✅</span>
                    <div>
                      <div style={{ fontWeight: '500' }}>{ap.usuario.nombre}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{new Date(ap.fecha).toLocaleDateString('es-CL')}</div>
                    </div>
                  </div>
                ))}
                {acta.aprobaciones.length === 0 && (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>Pendiente de firmas</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>👥 Asistencia</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {acta.asistencias.map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: a.presente ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{a.usuario.nombre}</span>
                    <span>{a.presente ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

      </div>
    </DashboardLayout>
  );
}
