#!/bin/zsh
cd "/Users/pranavtejlalapeta/Downloads/pranav project"
set -a
source .env
set +a
if [[ -z "$DB_USERNAME" ]]; then
  export DB_USERNAME="$USER"
fi
exec mvn spring-boot:run
