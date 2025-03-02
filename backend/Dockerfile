FROM python:3.11
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install --no-cache-dir poetry
RUN poetry config virtualenvs.create false  # 让 Poetry 直接安装在全局环境
RUN poetry install --only main  # 仅安装主要依赖
COPY . .
CMD ["poetry", "run", "flask", "run", "--host=0.0.0.0", "--port=5001"]