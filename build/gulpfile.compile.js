/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const gulp = require('gulp');
const util = require('./lib/util');
const tAsk = require('./lib/tAsk');
const compilAtion = require('./lib/compilAtion');

// Full compile, including nls And inline sources in sourcemAps, for build
const compileBuildTAsk = tAsk.define('compile-build', tAsk.series(util.rimrAf('out-build'), compilAtion.compileTAsk('src', 'out-build', true)));
gulp.tAsk(compileBuildTAsk);
exports.compileBuildTAsk = compileBuildTAsk;
