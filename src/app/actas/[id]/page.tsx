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
  creador: { nombre: string };
  acuerdos: Array<{
    id: string; titulo: string; descripcion: string; responsable?: { nombre: string }; fechaCompromiso?: string; estado: string;
  }>;
  links?: Array<{ token: string }>;
  asistencias: Array<{ usuario: { nombre: string; telefono?: string } }>;
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
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(249, 115, 22); // primary color
      doc.text(`ActasClub Basket`, 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`ACTA Nº ${acta.numero}/${acta.anio}`, 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(acta.titulo, 105, 40, { align: 'center' });

      // Meta Info
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Fecha: ${new Date(acta.fechaReunion).toLocaleDateString('es-CL')}`, 14, 55);
      doc.text(`Lugar: ${acta.lugarReunion}`, 14, 62);
      doc.text(`Tipo: ${acta.tipoReunion}`, 14, 69);
      doc.text(`Estado: ${acta.estado}`, 14, 76);

      let currentY = 90;

      // Temas Tratados
      if (acta.contenido?.temas && acta.contenido.temas.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Temas Tratados:', 14, currentY);
        currentY += 10;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        acta.contenido.temas.forEach((tema: string) => {
          doc.text(`• ${tema}`, 20, currentY);
          currentY += 7;
        });
        currentY += 10;
      }

      // Acuerdos using autoTable
      if (acta.acuerdos && acta.acuerdos.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Acuerdos:', 14, currentY);
        
        const tableData = acta.acuerdos.map((a, i) => [
          (i + 1).toString(),
          a.titulo + (a.descripcion ? `\n${a.descripcion}` : ''),
          a.responsable?.nombre || '—',
          a.fechaCompromiso ? new Date(a.fechaCompromiso).toLocaleDateString('es-CL') : '—',
          a.estado
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['#', 'Acuerdo', 'Responsable', 'Fecha', 'Estado']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 9 },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 20;
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Documento generado electrónicamente por ActasClub Basket • ${new Date().toLocaleDateString('es-CL')}`, 105, 285, { align: 'center' });

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

    let baseUrl = window.location.origin;
    if (baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('localhost', '127.0.0.1');
    }
    const urlConf = `${baseUrl}/compartido/${tokenToUse}`;
    
    let msg = `🏀 *ACTA EN REVISIÓN - ActasClub Basket*\n\n`;
    msg += `📋 *${acta?.titulo}*\n`;
    msg += `Acta Nº ${acta?.numero}/${acta?.anio}\n\n`;
    msg += `👉 Revisa el acta, comenta y aprueba aquí:\n${urlConf}\n`;

    const encodedMsg = encodeURIComponent(msg);
    // By omitting the 'phone' parameter, WhatsApp Web asks to select a contact or group!
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
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <button onClick={() => router.push('/actas')} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-2)' }}>← Volver</button>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold' }}>{acta.titulo}</h1>
            <p style={{ color: 'var(--color-primary)' }}>Acta Nº {acta.numero}/{acta.anio} • {acta.estado}</p>
          </div>
          <div>
            {acta.estado === 'BORRADOR' && (
              <button className="btn btn-primary" onClick={handleSendToReview} style={{ marginRight: 'var(--space-2)' }}>
                📤 Enviar a Revisión
              </button>
            )}
            {acta.estado === 'EN_REVISION' && (
              <button className="btn btn-primary" onClick={openWhatsAppGroup} style={{ marginRight: 'var(--space-2)' }}>
                📱 Compartir en Grupo (Gratis)
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleExportPDF}>🖨️ Exportar PDF</button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Detalles de la Reunión</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div><p style={{ color: 'var(--text-tertiary)' }}>Fecha:</p><p>{new Date(acta.fechaReunion).toLocaleDateString('es-CL')}</p></div>
            <div><p style={{ color: 'var(--text-tertiary)' }}>Lugar:</p><p>{acta.lugarReunion}</p></div>
          </div>
        </div>

        {acta.contenido?.temas && (
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Temas Tratados</h2>
            <ul>
              {acta.contenido.temas.map((tema: string, i: number) => (
                <li key={i} style={{ marginBottom: 'var(--space-2)' }}>• {tema}</li>
              ))}
            </ul>
          </div>
        )}

        {acta.acuerdos.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Acuerdos</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {acta.acuerdos.map(a => (
                <div key={a.id} style={{ background: 'var(--bg-input)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{a.titulo}</strong>
                    <span className="badge badge-en-curso">{a.estado}</span>
                  </div>
                  {a.descripcion && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>{a.descripcion}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
