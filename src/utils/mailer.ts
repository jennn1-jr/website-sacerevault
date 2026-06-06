import nodemailer from 'nodemailer';

export async function sendShareEmail(to: string, shareUrl: string, passcode?: string, documentName?: string) {
  try {
    // If SMTP settings are provided in .env, use them. Otherwise, simulate sending.
    const isMock = !process.env.SMTP_USER || !process.env.SMTP_PASS;
    
    let transporter;
    if (isMock) {
      // Create a mock transporter that just logs to console
      transporter = {
        sendMail: async (mailOptions: any) => {
          console.log('\n=============================================');
          console.log('📧 SIMULATED EMAIL SENT (SMTP not configured)');
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Content:\n${mailOptions.text}`);
          console.log('=============================================\n');
          return { messageId: 'mock-id-123' };
        }
      };
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    const docNameText = documentName ? `"${documentName}"` : "sebuah dokumen";
    
    let emailText = `Halo,\n\nSeseorang telah membagikan ${docNameText} kepada Anda secara aman melalui lockArchive.\n\n`;
    emailText += `🔗 Buka tautan berikut untuk mengunduh dokumen:\n${shareUrl}\n\n`;
    
    if (passcode) {
      emailText += `🔒 KODE AKSES RAHASIA: ${passcode}\n`;
      emailText += `(Masukkan kode ini saat membuka tautan di atas)\n\n`;
    }

    emailText += `Tautan ini bersifat sementara dan mungkin memiliki batas waktu atau batas akses.\n\nTerima kasih,\nTim lockArchive`;

    let htmlText = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">lockArchive Share</h2>
        <p>Halo,</p>
        <p>Seseorang telah membagikan <strong>${docNameText}</strong> kepada Anda secara aman.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <p style="margin-top: 0;"><strong>Tautan Akses:</strong></p>
          <a href="${shareUrl}" style="word-break: break-all; color: #3b82f6;">${shareUrl}</a>
        </div>
    `;

    if (passcode) {
      htmlText += `
        <div style="margin: 20px 0; padding: 15px; background-color: #fef9c3; border-left: 4px solid #eab308; border-radius: 6px;">
          <p style="margin-top: 0; color: #854d0e;"><strong>🔒 Kode Akses Rahasia:</strong></p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0; color: #000;">${passcode}</p>
          <p style="margin-bottom: 0; font-size: 12px; color: #854d0e;">Masukkan kode ini saat membuka tautan untuk mendekripsi dokumen.</p>
        </div>
      `;
    }

    htmlText += `
        <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          Tautan ini bersifat sementara dan mungkin memiliki batas waktu atau batas akses. Harap segera unduh dokumen Anda.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"lockArchive" <${process.env.SMTP_FROM || 'noreply@lockarchive.local'}>`,
      to,
      subject: `[lockArchive] Dokumen Dibagikan: ${documentName || 'File'}`,
      text: emailText,
      html: htmlText,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}
