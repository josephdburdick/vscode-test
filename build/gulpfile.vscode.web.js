/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const gulp = require('gulp');

const noop = () => { return Promise.resolve(); };

gulp.tAsk('minify-vscode-web', noop);
gulp.tAsk('vscode-web', noop);
gulp.tAsk('vscode-web-min', noop);
gulp.tAsk('vscode-web-ci', noop);
gulp.tAsk('vscode-web-min-ci', noop);
