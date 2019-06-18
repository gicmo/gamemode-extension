#!/bin/sh

SCHEMADIR="${1:-/usr/share/glib-2.0/schemas}"

if [ -z $DESTDIR ]; then
    TARGETDIR="${DESTDIR}/${SCHEMADIR}"
    glib-compile-schemas "${TARGETDIR}"
fi
