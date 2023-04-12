# GameMode GNOME Shell Extension

[GameMode][gamemode] is a software package to "optimize Linux system
performance on demand". This GNOME Shell extension will show the current
status of GameMode. For it to work, GameMode 1.4 or greater and GNOME
Shell version 3.34 or greater are required.

![screenshot][screenshot]

## Installation

From [GNOME Extensions website](https://extensions.gnome.org/extension/1852/gamemode/)

## From source

Obtain the current development version of GameMode extension via:

	git clone https://github.com/gicmo/gamemode-extension.git

A script is included to create a zip archive which also can also install
the extension for the current user. It depends on `meson`, `ninja` and `jq`.

	./make-zip.sh         # just create the archive
	./make-zip.sh install # create the archive and install it


## License
The GameMode GNOME Shell extension is distributed under the terms of the
GNU Lesser General Public License, version 2.1 or later. See the
COPYING file for details.

[gamemode]: https://github.com/FeralInteractive/gamemode
[screenshot]: https://github.com/gicmo/gamemode-extension/raw/master/screenshots/gamemode.png
