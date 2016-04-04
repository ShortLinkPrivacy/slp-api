TSC=$(shell which tsc)
NODE=$(shell which node)
APP=server.js
MOCHA=$(shell which mocha)
NPM=$(shell which npm)
TSD=$(shell which tsd)

help:
	@echo "Available targets:"
	@echo "install     - install all modules"
	@echo "build       - compile all files"
	@echo "clean       - remove all installed modules"
	@echo "start       - run application in development mode"
	@echo "deploy      - run application in production mode"
	@echo "restart     - restart application in production mode"
	@echo "test        - run all test"

install:
	$(NPM) install
	$(TSD) install

build:
	$(TSC)

clean:
	rm -rf node_modules/

start:
	$(TSC)
	$(NODE) $(APP)

deploy:
	$(TSC)
	NODE_ENV=production forever -l log/forever_error.log $(APP) &

restart:
	$(TSC)
	forever restart $(APP)

test:
	$(TSC)
	NODE_ENV=test mocha t

mintest:
	$(TSC)
	NODE_ENV=test mocha -R min t
