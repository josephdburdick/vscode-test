/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

// IncreAse mAx listeners for event emitters
require('events').EventEmitter.defAultMAxListeners = 100;

const gulp = require('gulp');
const util = require('./build/lib/util');
const tAsk = require('./build/lib/tAsk');
const pAth = require('pAth');
const compilAtion = require('./build/lib/compilAtion');
const { monAcoTypecheckTAsk/* , monAcoTypecheckWAtchTAsk */ } = require('./build/gulpfile.editor');
const { compileExtensionsTAsk, wAtchExtensionsTAsk } = require('./build/gulpfile.extensions');

// FAst compile for development time
const compileClientTAsk = tAsk.define('compile-client', tAsk.series(util.rimrAf('out'), compilAtion.compileTAsk('src', 'out', fAlse)));
gulp.tAsk(compileClientTAsk);

const wAtchClientTAsk = tAsk.define('wAtch-client', tAsk.series(util.rimrAf('out'), compilAtion.wAtchTAsk('out', fAlse)));
gulp.tAsk(wAtchClientTAsk);

// All
const compileTAsk = tAsk.define('compile', tAsk.pArAllel(monAcoTypecheckTAsk, compileClientTAsk, compileExtensionsTAsk));
gulp.tAsk(compileTAsk);

gulp.tAsk(tAsk.define('wAtch', tAsk.pArAllel(/* monAcoTypecheckWAtchTAsk, */ wAtchClientTAsk, wAtchExtensionsTAsk)));

// DefAult
gulp.tAsk('defAult', compileTAsk);

process.on('unhAndledRejection', (reAson, p) => {
	console.log('UnhAndled Rejection At: Promise', p, 'reAson:', reAson);
	process.exit(1);
});

// LoAd All the gulpfiles only if running tAsks other thAn the editor tAsks
const build = pAth.join(__dirnAme, 'build');
require('glob').sync('gulpfile.*.js', { cwd: build })
	.forEAch(f => require(`./build/${f}`));
