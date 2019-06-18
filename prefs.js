const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
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

        this.add(this.make_row_switch('emit-notifications'));
    }

    make_row_switch(name) {
        let row = new Gtk.ListBoxRow ();

        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
        row.add(hbox);

        let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        hbox.pack_start(vbox, true, true, 6);

        let sw = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        hbox.pack_end(sw, false, false, 6);

        let schema = this._settings.settings_schema;
        let key = schema.get_key(name);

        let summary = new Gtk.Label({
            label: `<span size='medium'><b>${key.get_summary()}</b></span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });

        vbox.pack_start(summary, true, true, 6);

        let description = new Gtk.Label({
            label: `<span size='small'>${key.get_description()}</span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });

        vbox.pack_end(description, true, true, 6);

        this._settings.bind(name, sw, 'active',
                            Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
});

function init() {
}

function buildPrefsWidget() {
    let widget = new GameModeSettings();
    widget.show_all();

    return widget;
}
