PROJ_ROOT := $(shell pwd)
TRUSTYCA_PROJ ?= $(abspath $(PROJ_ROOT)/../trustyca)
export TRUSTYCA_PROJ
ifeq ($(shell uname), Darwin)
SED_FLAGS=-i .bak
else
SED_FLAGS=-i
endif

UID := $(shell id -u)
GID := $(shell id -g)

.PHONY: all install test build proto typecheck format lint

all: install build docker

install:
	@echo "Running install"
	@npm install

test:
	@echo "Running test"
	npm test

typecheck:
	@npm run typecheck

format:
	@npm run format

# lint checks the sources, the formatting and the types; CI runs it before test
lint:
	@npm run lint
	@npm run format
	@npm run typecheck

build:
	@echo "Running build"
	@npm run build


proto:
	rm -rf ./src/services/trustyca/protogen
	mkdir -p ./src/services/trustyca/protogen/es/api
	npx protoc \
		--ts_out src/services/trustyca/protogen/es/api \
		--ts_opt long_type_string,use_proto_field_name \
		-I=${TRUSTYCA_PROJ}/api/pb/third_party/es/api \
		--proto_path ${TRUSTYCA_PROJ}/api/pb/third_party/es/api ${TRUSTYCA_PROJ}/api/pb/third_party/es/api/*.proto
	rm -rf ./src/services/trustyca/protogen/es/api/google/protobuf
	npx protoc \
		--ts_out src/services/trustyca/protogen/ \
		--ts_opt long_type_string,use_proto_field_name \
		-I=. \
		-I=${TRUSTYCA_PROJ}/api/pb/protos \
		-I=${TRUSTYCA_PROJ}/api/pb/third_party \
		--proto_path ${TRUSTYCA_PROJ}/api/pb/protos/ \
		${TRUSTYCA_PROJ}/api/pb/protos/auth.proto \
		${TRUSTYCA_PROJ}/api/pb/protos/ca.proto \
		${TRUSTYCA_PROJ}/api/pb/protos/cis.proto \
		${TRUSTYCA_PROJ}/api/pb/protos/orgs.proto \
		${TRUSTYCA_PROJ}/api/pb/protos/pkix.proto \
		${TRUSTYCA_PROJ}/api/pb/protos/status.proto \
		${TRUSTYCA_PROJ}/api/pb/protos/types.proto
	docker run --rm \
		--user $(UID):$(GID) \
		-v $(TRUSTYCA_PROJ)/api/pb:/dirs \
		-v $(TRUSTYCA_PROJ)/api/pb/third_party:/third_party \
		-v $(PROJ_ROOT)/src/services/trustyca/rpc:/rpc \
		--name trustyca-docker-protobuf \
		effectivesecurity/protoc-gen-go:sha-0841a17 \
			--i "-I /third_party" \
			--dirs /dirs/protos \
			--ts-enum src/services/trustyca/protogen /rpc \
			--files auth.proto,ca.proto,cis.proto,orgs.proto,pkix.proto,types.proto
	npm run format:fix
