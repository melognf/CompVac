# Reporte Semanal — Team Days

Script automatizado que cada **miércoles a las 06:00 ART** genera un PDF con el resumen del equipo y lo envía por mail.

## Componentes

- `.github/workflows/weekly-report.yml` — cron de GitHub Actions
- `report/generate-and-send.js` — script principal (Node)
- `report/template.html` — plantilla del PDF
- `report/package.json` — dependencias

## Setup (una sola vez)

Ver instrucciones detalladas en el chat de implementación. Resumen:

1. Generar **Firebase Service Account JSON** desde Firebase Console
2. Generar **Gmail App Password** (requiere 2-Step Verification)
3. Configurar **5 GitHub Secrets** en el repo

### GitHub Secrets necesarios

| Secret | Valor |
|---|---|
| `FIREBASE_DATABASE_URL` | `https://compensatoriosvac-default-rtdb.firebaseio.com` |
| `FIREBASE_SERVICE_ACCOUNT` | Contenido completo del JSON descargado |
| `GMAIL_USER` | `kokimbeta@gmail.com` |
| `GMAIL_APP_PASS` | Password de aplicación de 16 caracteres |
| `MAIL_TO` | Destinatario(s), coma-separados |

## Probar manualmente

GitHub → Actions → "Reporte semanal" → "Run workflow"

## Modificar el horario

Editar `.github/workflows/weekly-report.yml`, línea con `cron:`.
Recordar que está en **UTC** (Argentina = UTC-3).
