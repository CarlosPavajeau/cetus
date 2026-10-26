#!/bin/sh
set -eu

apt-get update
apt-get install -y --no-install-recommends ca-certificates
rm -rf /var/lib/apt/lists/*
update-ca-certificates

if command -v keytool >/dev/null 2>&1; then
    keytool -list -v -cacerts -storepass changeit > /tmp/cetus-ca-list
    sed -n 's/^Alias name: //p' /tmp/cetus-ca-list > /tmp/cetus-ca-aliases
    while IFS= read -r alias; do
        case "$alias" in
            *emsigneccrootcag3*|*emsign_ecc_root_ca__g3*|*comodoaaaca*|*aaa_certificate_services*)
                keytool -delete -cacerts -storepass changeit -alias "$alias"
                ;;
        esac
    done < /tmp/cetus-ca-aliases
    rm /tmp/cetus-ca-aliases /tmp/cetus-ca-list
fi
