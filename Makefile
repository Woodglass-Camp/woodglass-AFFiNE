db:
	docker compose -f ./.docker/dev/compose.yml up
server:
	yarn affine dev -p @affine/server
web:
	PORT=8081 yarn affine dev -p @affine/web
update:
	ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
	YARN_ENABLE_INLINE_BUILDS=1 DEBUG=@electron/get\* yarn install
