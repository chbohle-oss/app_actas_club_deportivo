import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  console.log(`📧 Intentando enviar correo a: ${options.to} - Asunto: ${options.subject}`);
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('❌ ERROR: SMTP credentials not configured. Email not sent.');
    console.log('Valores actuales:', { 
      SMTP_USER: process.env.SMTP_USER ? 'Configurado' : 'MISSING', 
      SMTP_PASS: process.env.SMTP_PASS ? 'Configurado' : 'MISSING' 
    });
    return { success: false, error: 'SMTP no configurado.' };
  }

  try {
    const transporter = getTransporter();
    console.log('🔌 Conectando con servidor SMTP...');

    await transporter.sendMail({
      from: `"ActasClub Basket" <${process.env.EMAIL_FROM || 'no-reply@actasclub.com'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`✅ Correo enviado con éxito a: ${options.to}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ ERROR al enviar correo a ${options.to}:`, error);
    return { success: false, error: 'Error al enviar email.' };
  }
}

// Email templates
export function emailActaRevision(nombre: string, actaTitulo: string, actaUrl: string): EmailOptions {
  return {
    to: '',
    subject: `📋 Acta pendiente de revisión: ${actaTitulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a1a; color: #f0f0f5; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">🏀 ActasClub Basket</h1>
        </div>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Se ha enviado un acta a revisión y requiere tu aprobación:</p>
        <div style="background: #16163a; padding: 16px; border-radius: 8px; border-left: 3px solid #f97316; margin: 16px 0;">
          <strong>${actaTitulo}</strong>
        </div>
        <p>
          <a href="${actaUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            📋 Ver y aprobar acta
          </a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Este correo fue enviado desde ActasClub Basket. Si no esperabas este mensaje, puedes ignorarlo.
        </p>
      </div>
    `,
  };
}

export function emailActaAprobada(nombre: string, actaTitulo: string, actaUrl: string): EmailOptions {
  return {
    to: '',
    subject: `✅ Acta aprobada: ${actaTitulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a1a; color: #f0f0f5; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">🏀 ActasClub Basket</h1>
        </div>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>El acta ha sido <strong style="color: #22c55e;">aprobada</strong>:</p>
        <div style="background: #16163a; padding: 16px; border-radius: 8px; border-left: 3px solid #22c55e; margin: 16px 0;">
          <strong>${actaTitulo}</strong>
        </div>
        <p>
          <a href="${actaUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            📋 Ver acta
          </a>
        </p>
      </div>
    `,
  };
}

export function emailInvitacionClub(nombre: string, clubNombre: string, loginUrl: string): EmailOptions {
  return {
    to: '',
    subject: `🏀 ¡Has sido invitado a ${clubNombre}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a1a; color: #f0f0f5; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">🏀 ActasClub Basket</h1>
        </div>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Has sido invitado a formar parte de <strong>${clubNombre}</strong> en nuestra plataforma de gestión de actas.</p>
        <div style="background: #16163a; padding: 16px; border-radius: 8px; border-left: 3px solid #f97316; margin: 16px 0;">
          <p style="margin: 0;">Desde ahora podrás revisar actas, participar en votaciones y estar al tanto de todos los acuerdos del club.</p>
        </div>
        <p>
          <a href="${loginUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            🚀 Acceder a mi Club
          </a>
        </p>
      </div>
    `,
  };
}

export function emailNuevaReunion(nombre: string, reunion: { titulo: string, fechaHora: string, lugar: string }, url: string): EmailOptions {
  return {
    to: '',
    subject: `📅 Nueva Reunión Citada: ${reunion.titulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a1a; color: #f0f0f5; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">🏀 ActasClub Basket</h1>
        </div>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Has sido citado a una nueva reunión:</p>
        <div style="background: #16163a; padding: 16px; border-radius: 8px; border-left: 3px solid #f97316; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #f97316;">${reunion.titulo}</h3>
          <p style="margin: 4px 0;"><strong>📅 Fecha:</strong> ${new Date(reunion.fechaHora).toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>📍 Lugar:</strong> ${reunion.lugar}</p>
        </div>
        <p>
          <a href="${url}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            📅 Ver detalles y confirmar asistencia
          </a>
        </p>
      </div>
    `,
  };
}
