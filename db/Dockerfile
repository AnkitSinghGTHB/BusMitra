FROM postgis/postgis:15-3.3

LABEL maintainer="BusMitra Team"
LABEL description="Isolated PostgreSQL + PostGIS database container for BusMitra"

# Copy initialization scripts
COPY ./init/ /docker-entrypoint-initdb.d/

EXPOSE 5432
