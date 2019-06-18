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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

imports.searchPath.unshift('.');
const GameMode = imports.client;

let credentials = new Gio.Credentials();
let pid = credentials.get_unix_pid();

let client = new GameMode.Client(function(client) {
    client.connect('state-changed', function(c, s) {
        print('state changed: ' + s + ' ' + client.clientCount);
    });

    GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
        client.registerGame(pid, (status, error) => {
            if (error || status < 0) {
                print("could not register to GameMode");
                return;
            }

            print("Registered to GameMode");
            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
                client.unregisterGame(pid, (status, error) => {
                    if (error || status < 0) {
                        print("could not unregister from GameMode");
                        return;
                    }

                    print("Unegistered to GameMode");
                });
            });
        });

    });
    print('state: ' + client.clientCount);
});

print('Entering loop');
let loop = new GLib.MainLoop(null, false);
loop.run();
