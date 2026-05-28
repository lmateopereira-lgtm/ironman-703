# Ironman 70.3 Dashboard — Setup

## 1. JSONBin.io (5 minutos)

1. Andá a https://jsonbin.io y creá una cuenta gratis
2. Una vez dentro, en el panel clickeá **"New Bin"**
3. Pegá este contenido como valor inicial:
   ```json
   {}
   ```
4. Guardá el Bin — copiá el **BIN ID** (aparece en la URL: `/b/XXXXXXX`)
5. En el menú de tu cuenta → **API Keys** → creá una key → copiá la **Master Key**

## 2. Vercel (5 minutos)

1. Andá a https://vercel.com y creá cuenta gratis (podés entrar con GitHub)
2. Clickeá **"Add New Project"**
3. Elegí **"Import Git Repository"** — si no tenés GitHub, usá la opción **"Deploy from CLI"**:

### Opción A: Con GitHub (recomendado)
1. Subí esta carpeta a un repo de GitHub (podés hacerlo desde github.com → New repo → Upload files)
2. En Vercel, importá ese repo
3. En **Environment Variables** agregá:
   - `VITE_JSONBIN_KEY` = tu Master Key de JSONBin
   - `VITE_JSONBIN_BIN` = tu Bin ID de JSONBin
4. Clickeá **Deploy** — en 2 minutos tenés tu URL

### Opción B: Con Vercel CLI
```bash
npm install -g vercel
cd ironman-70-3
vercel
# Seguí los pasos, cuando pregunte por env vars agregá las dos de arriba
```

## 3. Agregar al home screen del celular/iPad

### iPhone/iPad (Safari):
1. Abrí tu URL de Vercel en Safari
2. Tocá el botón compartir (📤)
3. → "Agregar a pantalla de inicio"
4. Ya tenés la app como ícono nativo

### Android (Chrome):
1. Abrí tu URL en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"

## Notas
- Todos los dispositivos que usen la misma URL verán los mismos datos
- Si no configurás JSONBin, la app funciona igual pero los datos quedan locales en cada dispositivo
- El indicador "☁️ sync" en el header confirma que está usando JSONBin
- El indicador "📱 local" significa que está en modo offline/local
