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

const Clutter = imports.gi.Clutter;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
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

class StatusMenuItem extends PopupMenu.PopupBaseMenuItem {
    constructor(client) {
        super();
        this._client = client;

        this._label = new St.Label({ text: 'GameMode status: ', x_expand: true });
        this.actor.add_child(this._label);

        this._status = new St.Label({ text: '...', x_expand: false });
        this.actor.add_child(this._status);

        this._changedId = client.connect('state-changed',
                                         this._onStateChanged.bind(this));
        this._onStateChanged(this._client, this._client.clientCount > 0);
    }

    destroy() {
        if (this._changedId) {
            this._client.disconnect(this._changedId);
            this._changedId = 0;
        }

        super.destroy();
    }

    _onStateChanged(cli, is_on) {
        this._status.text = is_on ? "on" : "off";
    }
}

class ClientCountMenuItem extends PopupMenu.PopupBaseMenuItem {
    constructor(client) {
        super();
        this._client = client;

        this._status = new St.Label({ text: 'GameMode status: ', x_expand: true });
        this.actor.add_child(this._status);

        this._changedId = client.connect('count-changed',
                                         this._onCountChanged.bind(this));
        this._onCountChanged(this._client, this._client.clientCount);
    }

    destroy() {
        if (this._changedId) {
            this._client.disconnect(this._changedId);
            this._changedId = 0;
        }

        super.destroy();
    }

    _onCountChanged(cli, count) {
        if (count > 0) {
            this._status.text = count + " active clients";
        } else if (count === 1) {
            this._status.text = "1 active client";
        } else {
            this._status.text = "No active clients";
        }
    }
}

/* main button */
var GameModeIndicator = GObject.registerClass(
    class GameModeIndicator extends PanelMenu.Button {

        _init() {
            super._init(0.0, "GameMode");
            this.connect('destroy', this._onDestroy.bind(this));

            let box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

            let icon = new St.Icon({
                icon_name: 'applications-games-symbolic',
                style_class: 'system-status-icon'
            });

            this._icon = icon;
            box.add_child(icon);
            this.actor.add_child(box);

            this._signals = [];

            this._client = new GameMode.Client(null);
            this._client.connect('state-changed', this._onStateChanged.bind(this));

            Main.sessionMode.connect('updated', this._sync.bind(this));
            this._sync();

            this._source = null;

            let red = Clutter.Color.get_static(Clutter.StaticColor.GREEN);
            this._color_effect = new Clutter.ColorizeEffect({tint: red});

            /* the menu */
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(new StatusMenuItem(this._client));
            this.menu.addMenuItem(new ClientCountMenuItem(this._client));

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
            this.actor.visible = active;
        }

        /* GameMode.Client callbacks */
        _onStateChanged(cli, is_on) {
            if (is_on) {
                this._notify("GameMode Activated", "Computer performance is now optimized for playing game");
                this._icon.add_effect_with_name('color', this._color_effect);
            } else {
                this._notify("GameMode Off", "Computer performance is reset for normal use");
                this._icon.remove_effect_by_name('color');
            }

            this._sync();
        }

    });

/* entry points */

let indicator = null;

function init() { }


function enable() {
    if (indicator)
        return;

    indicator = new GameModeIndicator();
    Main.panel.addToStatusArea('GameMode', indicator);
}

function disable() {
    if (!indicator)
        return;

    indicator.destroy();
    indicator = null;
}
