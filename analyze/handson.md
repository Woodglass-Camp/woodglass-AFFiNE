nvm use

bash scripts/cn-env.sh

HTTPS_PROXY=http://<server>:port ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ YARN_ENABLE_INLINE_BUILDS=1 DEBUG=@electron/get\* yarn install

yarn affine @affine/native build
yarn affine @affine/server-native build

# 启动开发用 server

cp ./.docker/dev/compose.yml.example ./.docker/dev/compose.yml
cp ./.docker/dev/.env.example ./.docker/dev/.env
yarn affine @affine/server-native build
yarn affine @affine/reader build

cp packages/backend/server/.env.example packages/backend/server/.env
yarn affine server init

# 修改 packages/backend/server/.env

```shell
DATABASE_URL="postgres://affine:affine@localhost:5432/affine"
REDIS_SERVER_HOST=localhost

# COPILOT_FAL_API_KEY=YOUR_KEY

# COPILOT_OPENAI_API_KEY=YOUR_KEY

# COPILOT_PERPLEXITY_API_KEY=YOUR_KEY
```

yarn dev
选择 server

yarn dev
选择 web
PORT=8081 yarn affine dev -p @affine/web
