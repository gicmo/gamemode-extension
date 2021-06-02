
SRCDIR := $(shell dirname "$0")
ABSSRC := $(shell realpath "$(SRCDIR)")
TMPDIR := $(shell mktemp -p "$(SRCDIR)" -d _install.XXXXXX)

UUID := gamemode@christian.kellner.me
VERSION := $(shell git describe 2> /dev/null || git rev-parse --short HEAD)
URL := https://github.com/gicmo/gamemode-extension

SOURCES := extension.js client.js
OTHER := LICENSE README.md
GEN := metadata.json

metadata.json: metadata.json.in
	@echo "SED $<"
	@sed 's/@VERSION@/$(VERSION)/; s/@UUID@/$(UUID)/;' $< > $@

.PHONY: zip
zip: $(SOURCES) $(GEN) $(OTHER)
	@echo "COPY $^ $(TMPDIR)"
	@cp $^ "$(TMPDIR)"/
	@echo "ZIP"
	@cd "$(TMPDIR)" ; \
	zip -rmq "$(ABSSRC)/$(UUID).shell-extension.zip" .
	@echo "RM"
	@rm -rf "$(TMPDIR)"

.PHONY: clean
clean:
	rm -rf metadata.json _install* *.zip
