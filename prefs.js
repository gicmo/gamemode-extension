const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

const {Gdk, Gio, GObject, Gtk} = imports.gi;
const Adw = shellVersion >= 42 ? imports.gi.Adw : null;


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
            this.margin_start = 24;
            this.margin_end = 24;
            this.margin_top = 24;
            this.margin_bottom = 24;
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
            hbox.margin_start = 12;
            hbox.margin_end = 12;
            hbox.margin_top = 12;
            hbox.margin_bottom = 12;
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
                button.margin_start = 6;
                button.margin_end = 6;
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


/*Gnome 42 - libadwaita implementation*/

const RowColorButton = shellVersion < 42 ? null : GObject.registerClass(
    {
        GTypeName: 'RowColorButton',
        Properties: {
            'css-color': GObject.ParamSpec.string(
                'css-color', 'css color',
                'The currently selected color, as a valid css color spec.',
                GObject.ParamFlags.READWRITE, ''
            )
        }
    },
    class RowColorButton extends Gtk.ColorButton {

        constructor(params) {
            super(params);
            this.bind_property_full(
                'css-color', this, 'rgba',
                GObject.BindingFlags.SYNC_CREATE |
                GObject.BindingFlags.BIDIRECTIONAL,
                (_, target)=> {
                    let rgba = new Gdk.RGBA();
                    rgba.parse(target);
                    return [true, rgba];
                },
                (_, target)=>[true, target.to_string()]
            );
        }
    });


const SwitchActionRow = shellVersion < 42 ? null : GObject.registerClass(
    {
        GTypeName: 'SwitchActionRow',
        Properties: {
            'active-key': GObject.ParamSpec.string(
                'active-key', 'Active key',
                'Key name in settings that stores the switch active property.',
                GObject.ParamFlags.READWRITE, ''
            ),
        },
    },
    class SwitchActionRow extends Adw.ActionRow {

        constructor({active_key, ...args}) {  
            super(args);
            this._settings = ExtensionUtils.getSettings();
            this._suffix_container = new Gtk.Box(
                {orientation: Gtk.Orientation.HORIZONTAL}
            );
            this._switch = new Gtk.Switch({valign: Gtk.Align.CENTER});
            
            this.add_suffix(this._suffix_container);
            this.add_suffix(this._switch);
            this.set_activatable_widget(this._switch);
            this.activeKey = active_key;
        }

        get active_key() {
            return this._active_key;
        }

        set active_key(key) {
            if (this.active_key === key)
                return;
            if (this._settings.settings_schema.get_key(key)) {
                let schema_key = this._settings.settings_schema.get_key(key);
                this.title = schema_key.get_summary();
                this.subtitle = schema_key.get_description();
                this._settings.bind(key, this._switch, 'active',
                                    Gio.SettingsBindFlags.DEFAULT);
                this._active_key = key;
                this.notify('active-key');
            }
        }
    });


const ColorActionRow = shellVersion < 42 ? null : GObject.registerClass(
    {
        GTypeName: 'ColorActionRow',
        InternalChilds: ['color_btn'],
        Properties: {
            'color-key': GObject.ParamSpec.string(
                'color-key', 'Color key',
                'Key name in settings that stores the selected color.',
                GObject.ParamFlags.READWRITE, ''
            ),
        },
    },
    class ColorActionRow extends SwitchActionRow {
    
        constructor({color_key, ...args}) {  
            super(args);
            this._color_btn = new RowColorButton({valign: Gtk.Align.CENTER});
            this._suffix_container.append(this._color_btn);
            this.colorKey = color_key;
        }
        
        get color_key() {
            return this._color_key;
        }

        set color_key(key) {
            if (this.color_key === key)
                return;
            if (this._settings.settings_schema.get_key(key)) {
                let schema_key = this._settings.settings_schema.get_key(key);
                this._color_btn.set_tooltip_markup(schema_key.get_description());
                this._settings.bind(key, this._color_btn, 'css-color',
                                    Gio.SettingsBindFlags.DEFAULT | 
                                    Gio.SettingsBindFlags.NO_SENSITIVITY);
                this._color_key = key;
                this.notify('color-key');
            }
        }
    });


function init() {
    ExtensionUtils.initTranslations();
}

// Gnome Shell < 42
function buildPrefsWidget() {
    let widget = new GameModeSettings();

    if (shellVersion < 40) {
        widget.show_all();
    }

    return widget;
}

// Gnome Shell >= 42
function fillPreferencesWindow(window) {
    let settings_page = Adw.PreferencesPage.new();
    let main_group = Adw.PreferencesGroup.new();
    
    main_group.add(new SwitchActionRow({active_key: 'emit-notifications'}));
    main_group.add(new SwitchActionRow({active_key: 'always-show-icon'}));
    main_group.add(new ColorActionRow(
        {active_key: 'active-tint', color_key: 'active-color'}));    
    
    settings_page.add(main_group);
    window.add(settings_page);
}

