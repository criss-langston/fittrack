#!/bin/bash
cd /home/sprite/fitness-app
# Use the real node binary directly, bypassing nvm wrapper and .npmrc conflicts
exec /.sprite/languages/node/nvm/versions/node/v22.20.0/bin/node node_modules/next/dist/bin/next start -p 3000
