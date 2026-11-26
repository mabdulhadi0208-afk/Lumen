#!/bin/bash
# One-time setup, run on your Mac, so macOS stops forgetting Lumen and Koi after every update (Keychain access for saved
# passwords and passkeys in Lumen; Accessibility / Input Monitoring for Koi).
#
# Why: every release used to be signed ad hoc, so each update looked like a brand new app to macOS. With one fixed
# certificate per app, every update is signed the same way and macOS keeps what you allowed.
#
# What it does: makes two self-signed code-signing certificates (valid 20 years), "Lumen Dev" and "Koi Self-Signed Code
# Signing", and puts each one ONLY into its repo's GitHub Actions secrets. Nothing goes into any repo. The keys stay in
# ~/.lumen-signing and ~/.koi-signing on this Mac (keep them; never commit them).
#   - With the GitHub CLI (gh) signed in, it sets the secrets for you.
#   - Without it, it copies each value to your clipboard and opens the GitHub page to paste it into.
# Run:  bash scripts/make-signing-certs.sh
set -euo pipefail

make_cert() {   # $1 dir, $2 file stem, $3 certificate common name
  local D="$1" N="$2" CN="$3"
  mkdir -p "$D"; chmod 700 "$D"
  if [ -f "$D/$N.p12" ]; then echo "  $D/$N.p12 already exists, reusing it"; return; fi
  cat > "$D/$N.cnf" <<CNF
[req]
distinguished_name=dn
x509_extensions=ext
prompt=no
[dn]
CN=$CN
[ext]
basicConstraints=critical,CA:false
keyUsage=critical,digitalSignature
extendedKeyUsage=critical,codeSigning
CNF
  openssl req -x509 -newkey rsa:2048 -nodes -days 7300 -keyout "$D/$N.key" -out "$D/$N.crt" -config "$D/$N.cnf" 2>/dev/null
  openssl rand -hex 24 > "$D/password"; chmod 600 "$D/password" "$D/$N.key"
  # -legacy keeps the .p12 readable by macOS's security tool when this is OpenSSL 3; LibreSSL does not know the flag
  openssl pkcs12 -export -legacy -inkey "$D/$N.key" -in "$D/$N.crt" -name "$CN" -out "$D/$N.p12" -passout "file:$D/password" 2>/dev/null \
    || openssl pkcs12 -export -inkey "$D/$N.key" -in "$D/$N.crt" -name "$CN" -out "$D/$N.p12" -passout "file:$D/password"
  chmod 600 "$D/$N.p12"
  echo "  made $D/$N.p12"
}

put_secret() {  # $1 repo, $2 secret name, $3 value
  local REPO="$1" NAME="$2" VALUE="$3"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    printf '%s' "$VALUE" | gh secret set "$NAME" --repo "$REPO" && echo "  set $NAME on $REPO"
  else
    printf '%s' "$VALUE" | pbcopy
    open "https://github.com/$REPO/settings/secrets/actions/new"
    echo
    echo "  >>> $NAME for $REPO is on your clipboard. In the page that just opened:"
    echo "      Name: $NAME    Secret: paste (Cmd V)    then press Add secret."
    read -r -p "      Press Return here when you have added it... " _ </dev/tty
  fi
}

echo "Lumen"
make_cert "$HOME/.lumen-signing" lumen "Lumen Dev"
put_secret mabdulhadi0208-afk/lumen MAC_CERT_P12 "$(base64 < "$HOME/.lumen-signing/lumen.p12" | tr -d '\n')"
put_secret mabdulhadi0208-afk/lumen MAC_CERT_PASSWORD "$(cat "$HOME/.lumen-signing/password")"

echo "Koi"
make_cert "$HOME/.koi-signing" koi "Koi Self-Signed Code Signing"
put_secret mabdulhadi0208-afk/mabdulhadi0208-afk-koi KOI_CERT_P12 "$(base64 < "$HOME/.koi-signing/koi.p12" | tr -d '\n')"
put_secret mabdulhadi0208-afk/mabdulhadi0208-afk-koi KOI_CERT_PASSWORD "$(cat "$HOME/.koi-signing/password")"

printf '' | pbcopy 2>/dev/null || true
echo
echo "Done. The next Lumen and Koi releases are signed with these certificates. After that update, allow Lumen's"
echo "Keychain prompt once (Always Allow) and re-add Koi in Accessibility once; from then on updates keep both."
