#!/usr/bin/env bash

# Read Compose-style dotenv values without evaluating the file as shell code.
# This intentionally supports the single-line values used by SecureInbox.
dotenv_get() {
  local key="$1" file="$2" line value found=false
  [[ -f "${file}" ]] || return 1

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ "${line}" =~ ^[[:space:]]*# || -z "${line//[[:space:]]/}" ]] && continue
    [[ "${line}" == "${key}="* ]] || continue
    value="${line#"${key}"=}"
    found=true
  done < "${file}"
  [[ "${found}" == true ]] || return 1
  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
    value="${value//\\\"/\"}"
    value="${value//\\\\/\\}"
  elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
    value="${value//\\\'/\'}"
  fi
  printf '%s' "${value}"
}

dotenv_write() {
  local key="$1" value="$2" file="$3" temporary_file
  temporary_file="$(mktemp "${file}.tmp.XXXXXX")"
  awk -v key="${key}" -v value="${value}" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 {
      if (!found) print key "=" value
      found = 1
      next
    }
    { print }
    END { if (!found) print key "=" value }
  ' "${file}" > "${temporary_file}"
  chmod 0600 "${temporary_file}"
  mv "${temporary_file}" "${file}"
}

dotenv_set() {
  dotenv_write "$@"
}

dotenv_set_if_missing() {
  local key="$1" value="$2" file="$3" current
  current="$(dotenv_get "${key}" "${file}" || true)"
  [[ -n "${current}" && "${current}" != "replace-with-a-generated-value" ]] ||
    dotenv_write "${key}" "${value}" "${file}"
}
