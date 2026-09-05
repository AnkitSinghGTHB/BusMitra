FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts

# Copy data files (used by the backend)
COPY data ./data

# Frontend is deployed separately on Vercel for this MVP.
# We do not need to copy or serve frontend/dist from the backend.

WORKDIR /app/backend
EXPOSE 3000

CMD ["node", "src/server.js"]
