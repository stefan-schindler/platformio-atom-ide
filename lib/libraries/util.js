/** @babel */

/**
 * Copyright 2016-present Ivan Kravets <me@ikravets.com>
 *
 * This source file is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License version 2
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import * as utils from '../utils';

import { isPioProject } from '../project/util';
import path from 'path';


export class LibStorageItem {

  static ACTION_REVEAL = 1;
  static ACTION_UNINSTALL = 2;
  static ACTION_UPDATE = 4;
  static ACTION_ALL = 8;

  constructor(name, path = undefined, items = undefined) {
    this.name = name;
    this.path = path;
    this._items = items;
    this._actions = LibStorageItem.ACTION_REVEAL;
  }

  get items() {
    return this._items;
  }

  set items(items) {
    if (items && items.length && !this.path) {
      this.path = path.dirname(items[0].__pkg_dir);
    }
    this._items = items;
  }

  get actions() {
    return this._actions;
  }

  set actions(actions) {
    if (typeof actions === 'number' && actions <= LibStorageItem.ACTION_ALL) {
      this._actions = actions;
    }
  }

}

export function runLibraryCommand(cmd, storage, ...extraArgs) {
  return new Promise((resolve, reject) => {
    let args = ['lib'];
    const spawnOptions = {};

    let cacheValid = null;
    if (cmd === 'stats') {
      cacheValid = '1h';
    }
    else if (cmd === 'show') {
      cacheValid = '1d';
    }
    else if (cmd === 'search') {
      cacheValid = '3d';
    }

    if (storage && isPioProject(storage)) {
      spawnOptions['cwd'] = storage;
    } else if (storage) {
      args.push('--storage-dir');
      args.push(storage);
    } else {
      args.push('--global');
    }
    args.push(cmd);
    args = args.concat(extraArgs);

    utils.runPIOCommand(
      args,
      (code, stdout, stderr) => {
        if (code !== 0) {
          const error = new Error(stderr);
          utils.notifyError(
            `Library command failed: ${args.join(' ')}`, error);
          reject(error);
        }
        resolve(args.indexOf('--json-output') !== -1 ? JSON.parse(stdout) : stdout);
      },
      cacheValid,
      spawnOptions
    );
  });
}

export function getCustomStorages() {
  const items = [];
  const storagesStr = atom.config.get(
    'platformio-ide.customLibraryStorages').trim();
  if (storagesStr) {
    storagesStr.split(', ').map(p => items.push(p.trim()));
  }
  return items.filter(p => utils.isDir(p));
}

export function saveCustomStorage(storagePath) {
  const current = getCustomStorages();
  storagePath = storagePath.trim();
  if (!utils.isDir(storagePath) || current.indexOf(storagePath) !== -1) {
    return false;
  }
  current.push(storagePath);
  atom.config.set(
    'platformio-ide.customLibraryStorages',
    current.filter(p => utils.isDir(p)).join(', ')
  );
  return true;
}