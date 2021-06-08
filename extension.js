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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;
const St = imports.gi.St;
const Shell = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = imports.misc.extensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Extension.metadata['gettext-domain']);
const _ = Gettext.gettext;

const GameMode = Extension.imports.client;

/* ui */
function getStatusText(is_on) {
    if (is_on) {
        return _("GameMode is active");
    }

    return _("GameMode is off");
}

var StatusMenuItem = GObject.registerClass(
    class StatusMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(client) {
            super._init();
            this._client = client;

            this._label = new St.Label({text: ('<status>'), x_expand: true});
            this.add_child(this._label);

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
            this._label.text = getStatusText(is_on);
        }
    });

var ClientCountMenuItem = GObject.registerClass(
    class ClientCountMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(client) {
            super._init();
            this._client = client;

            this._status = new St.Label({text: '<client count>', x_expand: true});
            this.add_child(this._status);

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
            if (count === 0) {
                this._status.text = _("No active clients");
            } else {
                this._status.text = Gettext.ngettext("%d active client",
                                                     "%d active clients",
                                                     count).format(count);
            }
        }
    });

/* main button */
var GameModeIndicator = GObject.registerClass(
    class GameModeIndicator extends PanelMenu.Button {

        _init() {
            super._init(0.0, 'GameMode');
            this._settings = ExtensionUtils.getSettings();

            this.connect('destroy', this._onDestroy.bind(this));

            let box = new St.BoxLayout({style_class: 'panel-status-menu-box'});

            let icon = new St.Icon({
                icon_name: 'applications-games-symbolic',
                style_class: 'system-status-icon'
            });

            this._icon = icon;
            box.add_child(icon);
            this.add_child(box);

            this._signals = [];

            /* react to settings changes */
            this._connect(this._settings,
                          'changed::always-show-icon',
                          this._sync.bind(this));

            this._connect(this._settings,
                          'changed::active-tint',
                          this._sync.bind(this));

            this._connect(this._settings,
                          'changed::active-color',
                          this._update_active_color.bind(this));

            /* connect to GameMode */
            this._client = new GameMode.Client(null);
            this._connect(this._client, 'state-changed', this._onStateChanged.bind(this));

            /* react to session changes */
            this._connect(Main.sessionMode, 'updated', this._sync.bind(this));

            this._source = null; /* for the notification */

            /* update the icon */
            this._update_active_color(); /* calls this._sync() */

            /* the menu */
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(new StatusMenuItem(this._client));
            this.menu.addMenuItem(new ClientCountMenuItem(this._client));

            log('GameMode extension initialized');
        }

        _connect(obj, signal, handler) {
            let id = obj.connect(signal, handler);
            this._signals.push([obj, id]);
        }

        _onDestroy() {
            log('Destroying GameMode extension');

            for (var i = 0; i < this._signals.length; i++) {
                let [obj, id] = this._signals[i];
                obj.disconnect(id);
            }
            this._signals = [];

            this._client.close();
        }

        _ensureSource() {
            if (!this._source) {
                this._source = new MessageTray.Source('GameMode',
                                                      'applications-games-symbolic');
                this._source.connect('destroy', () => {
                    this._source = null;
                });

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
            this._source.showNotification(this._notification);
        }

        /* Update the icon according to the current state */
        _sync() {
            let active = !Main.sessionMode.isLocked && !Main.sessionMode.isGreeter;

            let on = this._client.clientCount > 0;
            let alwaysShow = this._settings.get_boolean('always-show-icon');
            let tintIcon = this._settings.get_boolean('active-tint');

            if (this._icon.has_effects()) {
                this._icon.remove_effect_by_name('color');
            }

            if (on && tintIcon) {
                this._icon.add_effect_with_name('color', this._color_effect);
            }

            this.visible = active && (alwaysShow || on);
        }

        _update_active_color() {
            let str = this._settings.get_string('active-color');
            let rgba = new Gdk.RGBA();
            rgba.parse(str);

            let color = new Clutter.Color({
                red: rgba.red * 255,
                green: rgba.green * 255,
                blue: rgba.blue * 255,
                alpha: rgba.alpha * 255
            });
            this._color_effect = new Clutter.ColorizeEffect({tint: color});

            /* sync the changes */
            this._sync();
        }

        /* GameMode.Client callbacks */
        _onStateChanged(cli, is_on) {
            /* update the icon */
            this._sync();

            if (this._settings.get_boolean('emit-notifications')) {
                let status = getStatusText(is_on);
                if (is_on)
                    this._notify(status, _("Computer performance is now optimized for playing games"));
                else
                    this._notify(status, _("Computer performance is reset for normal usage"));
            }

            this._sync();
        }

    });

/* entry points */

let indicator = null;

function init() {
    ExtensionUtils.initTranslations();
}


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
