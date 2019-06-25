Patches
=======

Patches should be submitted in the form of merge requests at
[github][github].


Coding style
============

The repository has an .editorconfig file that should setup
modern editors with the basic indention information. There
is also an .eslintrc.json file to linting via eslint:

	npm install
	npm run lint


Translations
============

Translation is done via [transifex][transifex].

	ninja -C build gamemode-extension-pot
	tx push --source
	tx pull --all --force --minimum-perc=5
	ninja -C build fix-translations
	git add po/*.po


[github]: https://github.com/gicmo/gamemode-extension
[transifex]: https://www.transifex.com/GameMode/gamemode-gnome-shell-extension
