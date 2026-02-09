# trading-bot-backend/Dockerfile

# 1. Use an official Python runtime as a parent image
FROM python:3.9-slim

# 2. Set the working directory in the container
WORKDIR /app

# 3. Copy the dependencies file to the working directory
COPY requirements.txt .

# 4. Install any needed packages specified in requirements.txt
# (We add libpq-dev for Postgres support)
RUN apt-get update && apt-get install -y libpq-dev gcc && \
    pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the application code
COPY . .

# 6. Make port 8000 available to the world outside this container
EXPOSE 8000

# 7. Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]