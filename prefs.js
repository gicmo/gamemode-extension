const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

var GameModeSettings = GObject.registerClass(class GameModePrefWidget extends Gtk.ListBox {

    _init(params) {
        super._init(params);
        this.selection_mode = Gtk.SelectionMode.NONE;
        this._settings = ExtensionUtils.getSettings();
        this._blocked = [];

        if (shellVersion < 40) {
            this.margin = 24;
            this.add(this.make_row_switch('emit-notifications'));
            this.add(this.make_row_switch('always-show-icon'));
            this.add(this.make_row_switch('active-tint', 'active-color'));
        } else {
            this.append(this.make_row_switch('emit-notifications'));
            this.append(this.make_row_switch('always-show-icon'));
            this.append(this.make_row_switch('active-tint', 'active-color'));
        }
    }

    make_row_switch(name, color) {
        let schema = this._settings.settings_schema;

        let row = new Gtk.ListBoxRow ();

        let hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
        });

        if (shellVersion < 40) {
            row.add(hbox);
        } else {
            hbox.margin = 12;
            row.child = hbox;
        }

        let vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});

        if (shellVersion < 40) {
            hbox.pack_start(vbox, true, true, 6);
        } else {
            hbox.append(vbox);
        }

        let sw = new Gtk.Switch({valign: Gtk.Align.CENTER});

        if (color) {
            let button = new Gtk.ColorButton({use_alpha: true});

            button.connect('notify::rgba', (widget, param) => {
                let rgba = widget.get_rgba();
                let css = rgba.to_string();
                let idx = this._blocked.push(color);
                this._settings.set_string(color, css);
                this._blocked.splice(idx);
            });

            this._update_color_from_setting(button, color);

            this._settings.connect(`changed::${color}`, () => {
                this._update_color_from_setting(button, color);
            });

            if (shellVersion < 40) {
                hbox.pack_start(button, false, false, 6);
            } else {
                hbox.append(button);
            }

            sw.bind_property('active', button, 'sensitive',
                             GObject.BindingFlags.SYNC_CREATE);

            let ckey = schema.get_key(color);
            button.set_tooltip_markup(ckey.get_description());
        }

        if (shellVersion < 40) {
            hbox.pack_start(sw, false, false, 0);
        } else {
            hbox.append(sw);
        }

        let key = schema.get_key(name);

        let summary = new Gtk.Label({
            label: `<span size='medium'><b>${key.get_summary()}</b></span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });

        if (shellVersion < 40) {
            vbox.pack_start(summary, false, false, 0);
        } else {
            vbox.append(summary);
        }

        let description = new Gtk.Label({
            label: `<span size='small'>${key.get_description()}</span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        description.get_style_context().add_class('dim-label');

        if (shellVersion < 40) {
            vbox.pack_start(description, false, false, 0);
        } else {
            vbox.append(description);
        }

        this._settings.bind(name, sw, 'active',
                            Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _update_color_from_setting(widget, name) {
        let idx = this._blocked.indexOf(name);
        if (idx !== -1)
            return;

        let str = this._settings.get_string(name);
        let rgba = new Gdk.RGBA();
        rgba.parse(str);
        widget.set_rgba(rgba);
    }
});

function init() {
    ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    let widget = new GameModeSettings();

    if (shellVersion < 40) {
        widget.show_all();
    }

    return widget;
}
