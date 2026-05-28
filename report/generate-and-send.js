// ══════════════════════════════════════════════════════════════
//  Team Days — Generador y enviador del reporte semanal
//  1. Lee data de Firebase (con Admin SDK)
//  2. Renderiza template HTML con esa data
//  3. Lo convierte a PDF con Puppeteer
//  4. Envía mail con el PDF adjunto vía Gmail SMTP
// ══════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const REQUIRED_ENV = ['FIREBASE_DATABASE_URL', 'FIREBASE_SERVICE_ACCOUNT', 'GMAIL_USER', 'GMAIL_APP_PASS', 'MAIL_TO'];

function checkEnv() {
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('❌ Faltan variables de entorno: ' + missing.join(', '));
    process.exit(1);
  }
}

async function fetchData() {
  console.log('🔄 Conectando a Firebase...');
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  const db = admin.database();

  const [usersSnap, vacSnap, compSnap, adminsSnap] = await Promise.all([
    db.ref('users').once('value'),
    db.ref('vacations').once('value'),
    db.ref('compensatory').once('value'),
    db.ref('admins').once('value'),
  ]);

  const data = {
    users:        usersSnap.val()  || {},
    vacations:    vacSnap.val()    || {},
    compensatory: compSnap.val()   || {},
    admins:       adminsSnap.val() || {},
    generatedAt:  new Date().toISOString(),
  };
  console.log(`✓ Data: ${Object.keys(data.users).length} usuarios, ${Object.keys(data.vacations).length} con vacaciones, ${Object.keys(data.compensatory).length} con comps`);
  return data;
}

async function generatePdf(data) {
  console.log('🎨 Renderizando PDF...');
  const templatePath = path.join(__dirname, 'template.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  // Inyectamos la data como JSON sin escapar para que el script del template la lea
  const html = template.replace('__DATA__', JSON.stringify(data).replace(/<\/script>/g, '<\\/script>'));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    // Esperar un tick para que el script render() se ejecute
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    console.log(`✓ PDF generado (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

async function sendEmail(pdfBuffer, data) {
  console.log('📨 Enviando mail...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const userCount = Object.keys(data.users).filter(uid => !data.admins[uid]).length;

  const filename = `reporte-team-days-${today.toISOString().split('T')[0]}.pdf`;

  await transporter.sendMail({
    from: `"Team Days" <${process.env.GMAIL_USER}>`,
    to: process.env.MAIL_TO,
    subject: `📋 Reporte semanal Team Days — ${dateStr}`,
    text: `Adjunto el reporte semanal del equipo generado automáticamente.\n\nFecha: ${dateStr}\nMiembros del equipo: ${userCount}\n\n— Team Days`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:520px">
        <h2 style="color:#DC2626;margin:0 0 8px">📋 Reporte semanal Team Days</h2>
        <p style="color:#6b7280;margin:0 0 18px;font-size:14px">${dateStr}</p>
        <p>Hola Emiliano,</p>
        <p>Adjunto el reporte semanal del equipo generado automáticamente.</p>
        <p><strong>Incluye:</strong></p>
        <ul style="line-height:1.7">
          <li>Resumen general (compensatorios en banco, solicitudes pendientes, vacaciones)</li>
          <li>Detalle por miembro del equipo</li>
          <li>Gráfico panorámico de los próximos 12 meses</li>
          <li>Alertas de solicitudes esperando autorización</li>
        </ul>
        <p style="margin-top:24px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">
          Este reporte se envía automáticamente todos los miércoles a las 06:00 ART.<br>
          También funciona como backup por si algo le pasa a la app.
        </p>
      </div>
    `,
    attachments: [{
      filename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
  console.log(`✓ Mail enviado a ${process.env.MAIL_TO}`);
}

(async () => {
  try {
    checkEnv();
    const data = await fetchData();
    const pdf = await generatePdf(data);
    await sendEmail(pdf, data);
    console.log('\n🎉 Reporte enviado correctamente');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error generando/enviando reporte:');
    console.error(err);
    process.exit(1);
  }
})();
