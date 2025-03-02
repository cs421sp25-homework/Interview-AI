FROM python:3.11
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install --no-cache-dir poetry
RUN poetry config virtualenvs.create false
RUN poetry install --only main  
COPY . .
CMD ["poetry", "run", "flask", "run", "--host=0.0.0.0", "--port=5001"]