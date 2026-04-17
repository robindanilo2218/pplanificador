# Instrucciones del Agente

## Entorno y Shell
- Usa siempre el shell de WSL Debian. 
- Usa exclusivamente comandos bash/Linux (ls, mv, grep, etc). NUNCA comandos nativos de PowerShell.
- Actualiza el .gitignore si se generan carpetas de logs temporales o basura.

## Código y Comentarios (Ahorro de Tokens)
- NO sobredocumentes el código. Usa comentarios concisos ÚNICAMENTE en partes verdaderamente complejas o trucos lógicos. 
- NO generes archivos .md extra explicando algoritmos, a menos que yo te pida explícitamente "Documenta y explica esta función". 

## Registro y Seguimiento de Tareas
- Al final del chat, crea/actualiza un solo archivo llamado `historial_IA.md` (no hagas un archivo por chat) colocando solo la FECHA y un resumen de 2 líneas de los cambios implementados en esa sesión.
- Siempre mantén actualizado el archivo `pendientes.md` (marcando lo completado) e incluye ahí mismo solo 1 o 2 propuestas tuyas para seguir iterando.
