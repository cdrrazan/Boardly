FROM ruby:3.3-slim

# ca-certificates for TLS (GitHub API + SMTP); build-essential not needed for the
# pure-Ruby `mail` gem.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install gems first for better layer caching.
COPY Gemfile ./
RUN gem install bundler --no-document \
    && bundle config set --local without 'development' \
    && bundle install

COPY lib ./lib
COPY bin ./bin

ENTRYPOINT ["ruby", "/app/bin/boardly"]
