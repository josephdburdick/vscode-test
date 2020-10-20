/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteConnection, BrowserMessAgeReAder, BrowserMessAgeWriter } from 'vscode-lAnguAgeserver/browser';
import { stArtServer } from '../jsonServer';

declAre let self: Any;

const messAgeReAder = new BrowserMessAgeReAder(self);
const messAgeWriter = new BrowserMessAgeWriter(self);

const connection = creAteConnection(messAgeReAder, messAgeWriter);

stArtServer(connection, {});
