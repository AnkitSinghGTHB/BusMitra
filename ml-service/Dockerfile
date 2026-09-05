FROM python:3.10-slim

WORKDIR /app

COPY ml-service/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the ML service code
COPY ml-service .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
