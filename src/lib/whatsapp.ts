// WhatsApp integration via Twilio
// Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env

interface WhatsAppMessage {
  to: string;          // Phone number with country code, e.g. '+56912345678'
  message: string;
}

interface CitacionData {
  reunionTitulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  agenda?: string;
  confirmacionUrl: string;
}

export function formatCitacionMessage(data: CitacionData): string {
  let message = `🏀 *CONVOCATORIA - ActasClub Basket*\n\n`;
  message += `📋 *${data.reunionTitulo}*\n`;
  message += `📅 Fecha: ${data.fecha}\n`;
  message += `🕐 Hora: ${data.hora}\n`;
  message += `📍 Lugar: ${data.lugar}\n`;

  if (data.agenda) {
    message += `\n📌 *Agenda:*\n${data.agenda}\n`;
  }

  message += `\n👉 Confirma tu asistencia aquí:\n${data.confirmacionUrl}\n`;
  message += `\n_Responde: ✅ Acepto / ❌ No puedo / 🤔 Tal vez_`;

  return message;
}

export function formatActaNotification(tipo: 'aprobada' | 'rechazada', actaTitulo: string, actaUrl: string): string {
  const emoji = tipo === 'aprobada' ? '✅' : '❌';
  return `${emoji} *Acta ${tipo.toUpperCase()}*\n\n📋 ${actaTitulo}\n\n👉 Ver acta: ${actaUrl}`;
}

export async function sendWhatsAppMessage({ to, message }: WhatsAppMessage): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- WHATSAPP MOCK (DEV MODE) ---');
      console.log(`To: ${to}`);
      console.log(`Message:\n${message}`);
      console.log('--------------------------------');
      return { success: true, sid: 'mock_sid_' + Date.now() };
    }
    console.warn('Twilio credentials not configured. Message not sent.');
    return { success: false, error: 'Twilio no configurado. Agrega tus credenciales en .env' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      From: from,
      To: `whatsapp:${to}`,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Error de Twilio.' };
    }

    return { success: true, sid: data.sid };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: 'Error al enviar WhatsApp.' };
  }
}

export async function sendCitacion(
  telefono: string,
  data: CitacionData
): Promise<{ success: boolean; error?: string }> {
  const message = formatCitacionMessage(data);
  return sendWhatsAppMessage({ to: telefono, message });
}
