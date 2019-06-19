const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var GameModeSettings = GObject.registerClass(class GameModePrefWidget extends Gtk.ListBox {

    _init(params) {
        super._init(params);
        this.selection_mode = Gtk.SelectionMode.NONE;
        this.margin = 24;
        this._settings = ExtensionUtils.getSettings();
        this._blocked = [];

        this.add(this.make_row_switch('emit-notifications'));
        this.add(this.make_row_switch('always-show-icon'));
    }

    make_row_switch(name, color) {
        let row = new Gtk.ListBoxRow ();

        let hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin: 12,
        });

        row.add(hbox);

        let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        hbox.pack_start(vbox, true, true, 6);

        let sw = new Gtk.Switch({ valign: Gtk.Align.CENTER });

        if (color) {
            let button = new Gtk.ColorButton({use_alpha: true});

            let id = button.connect('notify::rgba', (widget, param) => {
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

            hbox.pack_start(button, false, false, 6);
            sw.bind_property('active', button, 'sensitive',
                             GObject.BindingFlags.SYNC_CREATE);
        }

        hbox.pack_start(sw, false, false, 0);

        let schema = this._settings.settings_schema;
        let key = schema.get_key(name);

        let summary = new Gtk.Label({
            label: `<span size='medium'><b>${key.get_summary()}</b></span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });

        vbox.pack_start(summary, false, false, 0);

        let description = new Gtk.Label({
            label: `<span size='small'>${key.get_description()}</span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        description.get_style_context().add_class('dim-label');

        vbox.pack_start(description, false, false, 0);

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
}

function buildPrefsWidget() {
    let widget = new GameModeSettings();
    widget.show_all();

    return widget;
}
