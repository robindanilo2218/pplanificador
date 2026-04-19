#!/bin/bash
FILE="/mnt/c/Users/robin/Documents/Antigravity Projects/pplanificador/proyeccion/index.html"

echo "=== FUNCIONES LLAMADAS (onclick / addEventListener / template literals) ==="
grep -oE 'onclick="[^"]+"' "$FILE" | grep -oE '"[a-zA-Z_][a-zA-Z0-9_]*\(' | grep -oE '[a-zA-Z_][a-zA-Z0-9_]+' | sort -u

echo ""
echo "=== FUNCIONES DEFINIDAS (function xxx / xxx = function) ==="
grep -oE '(function [a-zA-Z_][a-zA-Z0-9_]+|window\.[a-zA-Z_][a-zA-Z0-9_]+ =)' "$FILE" | grep -oE '[a-zA-Z_][a-zA-Z0-9_]+' | grep -v '^function$' | grep -v '^window$' | sort -u

echo ""
echo "=== REFERENCIAS EN TEMPLATE LITERALS (onclick en JS) ==="
grep -oE "onclick=['\"][a-zA-Z_][a-zA-Z0-9_]+\(" "$FILE" | grep -oE '[a-zA-Z_][a-zA-Z0-9_]+' | sort -u
