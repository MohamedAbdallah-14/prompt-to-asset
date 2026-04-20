# Dockerfile for the prompt-to-asset MCP server.
#
# Build:
#   docker build -t prompt-to-asset .
#
# Build with sharp (platform export / raster ops) and resvg:
#   docker build --build-arg WITH_SHARP=1 -t prompt-to-asset .
#
# Run (stdio transport — this is how MCP clients consume the server):
#   docker run --rm -i \
#     -e OPENAI_API_KEY -e IDEOGRAM_API_KEY -e RECRAFT_API_KEY \
#     -v "$PWD/tmp":/work/tmp \
#     prompt-to-asset
#
# The image is intentionally minimal — no provider SDK is bundled.
# Credentials come in as environment variables at runtime, never at build.

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /src

# Install workspace manifests first for dependency-layer cache reuse.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY apps/web/package.json ./apps/web/

ARG WITH_SHARP=0
RUN --mount=type=cache,target=/root/.npm \
    if [ "${WITH_SHARP}" = "1" ]; then \
      npm ci --include=optional; \
    else \
      npm ci --omit=optional; \
    fi

# Now copy source and build the MCP server.
COPY packages/mcp-server ./packages/mcp-server
COPY data ./data
RUN npm run build

# Prune dev deps for the runtime image.
RUN npm prune --omit=dev


FROM node:${NODE_VERSION}-slim AS runtime

LABEL org.opencontainers.image.title="prompt-to-asset"
LABEL org.opencontainers.image.description="MCP server that routes briefs to image models and runs a deterministic post-processing pipeline."
LABEL org.opencontainers.image.source="https://github.com/yourorg/prompt-to-asset"
LABEL org.opencontainers.image.licenses="MIT"

RUN groupadd --system mcp && useradd --system --gid mcp --home-dir /work --no-create-home mcp
RUN install -d -o mcp -g mcp /work

WORKDIR /work

COPY --from=builder --chown=mcp:mcp /src/package.json /src/package-lock.json ./
COPY --from=builder --chown=mcp:mcp /src/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /src/packages ./packages
COPY --from=builder --chown=mcp:mcp /src/data ./data

ENV NODE_ENV=production

USER mcp

# stdio transport — keep STDIN open, don't allocate a TTY.
ENTRYPOINT ["node", "/work/packages/mcp-server/dist/index.js"]
