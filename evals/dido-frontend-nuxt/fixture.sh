#!/usr/bin/env bash
# La copia dello starter Nuxt per una sessione di dido-frontend-nuxt, con una card dello studio
# nella pagina contatti (componente, stile e un'area delle lingue), già committata.
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
#   componente-cambiato: la richiesta aggiunge un elemento alla card che c'è.
#   hover-touch: la richiesta dà alla card un hover, che sul touch non deve valere.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN="$HERE/../bin"
case_name="$1"; repo="$2"; config="$3"
starter="${NUXT_STARTER:-$HOME/Desktop/Dido Git Test/starter-kit-nuxt-webapp}"
commit="${NUXT_STARTER_COMMIT:-4967882}"

bash "$BIN/starter-copy.sh" "$starter" "$commit" "$repo" "$config"

case "$case_name" in
  componente-cambiato|hover-touch)
    work="$HERE/work/office-card"
    mkdir -p "$repo/app/components/contacts/office-card"
    cp "$work/index.vue" "$work/style.scss" "$repo/app/components/contacts/office-card/"
    for language in it en; do
      cp "$work/$language.js" "$repo/i18n/locales/$language/contacts.js"
      python3 -I - "$repo/i18n/locales/$language.js" "$language" <<'PY'
import sys
from pathlib import Path
path, language = Path(sys.argv[1]), sys.argv[2]
text = path.read_text()
text = text.replace(f'import accessibility from "~~/i18n/locales/{language}/accessibility.js";\n',
                    f'import accessibility from "~~/i18n/locales/{language}/accessibility.js";\n'
                    f'import contacts from "~~/i18n/locales/{language}/contacts.js";\n', 1)
text = text.replace("({ accessibility, errors", "({ accessibility, contacts, errors", 1)
path.write_text(text)
PY
    done
    python3 -I - "$repo/app/pages/contacts.vue" <<'PY'
import sys
from pathlib import Path
path = Path(sys.argv[1])
text = path.read_text()
anchor = '{{ $t("nav.home") }}</NuxtLink>\n'
assert anchor in text
path.write_text(text.replace(anchor, anchor + "    <ContactsOfficeCard />\n", 1))
PY
    git -C "$repo" add -A -- app/components i18n app/pages/contacts.vue
    git -C "$repo" -c user.name=Team -c user.email=team@example.com commit -q --amend --no-edit
    ;;
  *) echo "caso sconosciuto: $case_name" >&2; exit 1 ;;
esac
