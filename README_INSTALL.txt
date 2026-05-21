CaromChamps v6.4.0 - Instalación local Windows

IMPORTANTE SOBRE "localhost refused to connect"
Ese mensaje aparece cuando el servidor local de CaromChamps no está corriendo.
Para evitarlo, use siempre START_CAROMCHAMPS.bat o instale la tarea de autoarranque.

Instalación limpia:
1. Descomprime el ZIP en C:\proyectos\caromchamps
2. Abre PowerShell en esa carpeta.
3. Ejecuta:

   npm.cmd install --registry=https://registry.npmjs.org/
   npm.cmd run check:syntax
   npm.cmd run build
   .\START_CAROMCHAMPS.ps1

Uso diario recomendado:
   Doble click en START_CAROMCHAMPS.bat

Autoarranque al iniciar sesión:
   PowerShell como usuario normal desde la carpeta del proyecto:
   .\INSTALL_CAROMCHAMPS_AUTOSTART.ps1

Quitar autoarranque:
   .\REMOVE_CAROMCHAMPS_AUTOSTART.ps1

URL local:
http://localhost:5173/#tab=grand
