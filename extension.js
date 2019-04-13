/*
 * Copyright © 2019 Red Hat, Inc
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library. If not, see <http://www.gnu.org/licenses/>.
 *
 * Authors:
 *       Christian J. Kellner <christian@kellner.me>
 */

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;
const St = imports.gi.St;
const Shell = imports.gi.Shell;

const GameMode = Extension.imports.client;

/* ui */
var GameModeIndicator = class extends PanelMenu.SystemIndicator {

    constructor() {
        super();

        this._indicator = this._addIndicator();
	this._indicator.icon_name = 'night-light-symbolic';

	this._signals = [];

	this._client = new GameMode.Client(null);
	this._client.connect('state-changed', this._onStateChanged.bind(this));

	Main.sessionMode.connect('updated', this._sync.bind(this));
        this._sync();

	this._source = null;
	this._indicator.connect('destroy', this._onDestroy.bind(this));
	log('GameMode extension initialized');
    }

    _onDestroy() {
	log('Destorying GameMode extension');
	this._client.close();
    }

    _ensureSource() {
        if (!this._source) {
            this._source = new MessageTray.Source(_("GameMode"),
                                                  'application-games-symbolic');
            this._source.connect('destroy', () => { this._source = null; });

            Main.messageTray.add(this._source);
        }

        return this._source;
    }

    _notify(title, body) {
        if (this._notification)
            this._notification.destroy();

        let source = this._ensureSource();

	this._notification = new MessageTray.Notification(source, title, body);
	this._notification.setUrgency(MessageTray.Urgency.HIGH);
        this._notification.connect('destroy', () => {
            this._notification = null;
        });
        this._source.notify(this._notification);
    }

    /* Session callbacks */
    _sync() {
        let active = !Main.sessionMode.isLocked && !Main.sessionMode.isGreeter;
	this._indicator.visible = active;
    }

    /* GameMode.Client callbacks */
    _onStateChanged(cli, is_on) {
	if (is_on)
	    this._notify("GameMode On", "Computer performance optimized for playing game");
	else
	    this._notify("GameMode Off", "Computer performace reset for normal use");

        this._sync();
    }

};

/* entry points */

let indicator = null;

function init() { }


function enable() {
    if (indicator)
	return;

    indicator = new GameModeIndicator();
    Main.panel.statusArea.aggregateMenu._indicators.insert_child_at_index(indicator.indicators, 0);
}

function disable() {
    if (!indicator)
	return;

    indicator.destroy();
    indicator = null;
}
