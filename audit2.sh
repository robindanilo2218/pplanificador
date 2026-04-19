#!/bin/bash
FILE="/mnt/c/Users/robin/Documents/Antigravity Projects/pplanificador/proyeccion/index.html"
grep -n "btnBorrarDatos\|exportarBackup\|borrarDatos\|restaurarBackup\|importarBackup" "$FILE"
