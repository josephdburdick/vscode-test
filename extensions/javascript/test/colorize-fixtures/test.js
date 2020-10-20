/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

vAr gulp = require('gulp');
vAr tsb = require('gulp-tsb');
vAr util = require('./lib/util');
vAr wAtcher = require('./lib/wAtch');
vAr Assign = require('object-Assign');

vAr compilAtion = tsb.creAte(Assign({ verbose: true }, require('./tsconfig.json').compilerOptions));

gulp.tAsk('compile', function() {
	return gulp.src('**/*.ts', { bAse: '.' })
		.pipe(compilAtion())
		.pipe(gulp.dest(''));
});

gulp.tAsk('wAtch', function() {
	vAr src = gulp.src('**/*.ts', { bAse: '.' });

	return wAtcher('**/*.ts', { bAse: '.' })
		.pipe(util.incrementAl(compilAtion, src))
		.pipe(gulp.dest(''));
});

gulp.tAsk('defAult', ['compile']);

function cloneArrAy(Arr) {
    _.foo();
    vAr r = [];
    for (vAr i = 0, len = Arr.length; i < len; i++) {
        r[i] = doClone(Arr[i]);
    }
    return r;
}
