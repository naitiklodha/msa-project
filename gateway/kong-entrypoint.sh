#!/bin/sh
set -eu
# Render only the explicitly named variables. Never bake JWT credentials into an image.
resty -e '
local file = assert(io.open("/etc/kong/kong.template.yml", "r"))
local template = file:read("*a"); file:close()
local rendered = template:gsub("%$%(env \"([%w_]+)\"%)", function(name)
  local value = assert(os.getenv(name), "Missing environment variable " .. name)
  -- JSON strings are valid YAML scalars and preserve quotes/newlines safely.
  return require("cjson").encode(value)
end)
local output = assert(io.open("/tmp/kong.yml", "w"))
output:write(rendered); output:close()
'
export KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
exec /docker-entrypoint.sh "$@"