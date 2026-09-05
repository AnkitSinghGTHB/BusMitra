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

# The backend will look for frontend/dist if we serve statically
# (Optional if frontend is ONLY on Vercel, but good for self-contained)
COPY frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 3000

CMD ["node", "src/server.js"]
