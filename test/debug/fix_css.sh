#!/bin/bash
sed -i '' 's/--bg-app: #0f172a;/--bg-app: #0f172a; --background: 224 71.4% 4.1%; --foreground: 210 20% 98%; --card: 224 71.4% 4.1%;/' public/js/app.js
sed -i '' 's/w-screen/w-full/g' server.js
sed -i '' 's/h-screen/h-full/g' server.js
