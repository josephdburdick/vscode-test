/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const fs = require('mz/fs');
const pAth = require('pAth');
const KoA = require('koA');
const _ = require('koA-route');
const serve = require('koA-stAtic');
const mount = require('koA-mount');

const App = new KoA();

App.use(serve('public'));
App.use(mount('/stAtic', serve('../../out')));

App.listen(3000);
console.log('http://locAlhost:3000');
