#!/usr/bin/env bash
# Throwaway real Postgres for local runs and CI without Docker or root: Zonky's statically linked Alpine
# builds from Maven Central, cached in ~/.cache/studio-pg. Usage: smoke-pg.sh start <port> <dataDir> | stop <dataDir>
set -euo pipefail
PG_MAJOR=${PG_MAJOR:-17}
CACHE=${STUDIO_PG_CACHE:-$HOME/.cache/studio-pg}
ARTIFACT=${STUDIO_PG_ARTIFACT:-embedded-postgres-binaries-linux-amd64}

ensure_binaries() {
  if [[ -x "$CACHE/$PG_MAJOR/bin/postgres" ]]; then return; fi
  mkdir -p "$CACHE/$PG_MAJOR"
  local meta ver jar
  meta=$(curl -fsSL "https://repo1.maven.org/maven2/io/zonky/test/postgres/$ARTIFACT/maven-metadata.xml")
  ver=$(echo "$meta" | grep -oE "<version>$PG_MAJOR\.[0-9.]+</version>" | sed -E 's/<\/?version>//g' | sort -V | tail -1)
  [[ -n "$ver" ]] || { echo "no $ARTIFACT $PG_MAJOR.x on Maven Central" >&2; exit 1; }
  jar="$CACHE/$ARTIFACT-$ver.jar"
  echo "downloading postgres $ver ($ARTIFACT)…" >&2
  curl -fsSL -o "$jar" "https://repo1.maven.org/maven2/io/zonky/test/postgres/$ARTIFACT/$ver/$ARTIFACT-$ver.jar"
  local txz
  txz=$(unzip -Z1 "$jar" | grep -E '\.txz$' | head -1)
  unzip -qo "$jar" "$txz" -d "$CACHE/$PG_MAJOR/tmp"
  tar -xJf "$CACHE/$PG_MAJOR/tmp/$txz" -C "$CACHE/$PG_MAJOR"
  rm -rf "$CACHE/$PG_MAJOR/tmp" "$jar"
}

cmd=${1:-start}
case "$cmd" in
  start)
    port=${2:-5499}; dir=${3:-.smoke/pg}
    ensure_binaries
    # A previous run may still be serving this directory (killed job, trap skipped): stop it before re-initialising.
    "$CACHE/$PG_MAJOR/bin/pg_ctl" -D "$dir" -m immediate -w stop >/dev/null 2>&1 || true
    pkill -f "bin/postgres -D $dir" 2>/dev/null || true
    rm -rf "$dir"; mkdir -p "$dir"
    echo pg > "$dir.pw"
    "$CACHE/$PG_MAJOR/bin/initdb" -D "$dir" -U postgres --pwfile="$dir.pw" -A md5 -E UTF8 >/dev/null
    "$CACHE/$PG_MAJOR/bin/pg_ctl" -D "$dir" -o "-p $port -k /tmp -c listen_addresses=127.0.0.1" -l "$dir.log" -w start >/dev/null
    echo "READY postgres://postgres:pg@127.0.0.1:$port/postgres"
    ;;
  stop)
    dir=${2:-.smoke/pg}
    "$CACHE/$PG_MAJOR/bin/pg_ctl" -D "$dir" -m fast -w stop >/dev/null 2>&1 || true
    ;;
  *) echo "usage: $0 start <port> <dir> | stop <dir>" >&2; exit 2 ;;
esac
