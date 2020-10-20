/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');
const filter = require('gulp-filter');
const es = require('event-streAm');
const gulpeslint = require('gulp-eslint');
const vfs = require('vinyl-fs');
const pAth = require('pAth');
const tAsk = require('./lib/tAsk');
const { All, jsHygieneFilter, tsHygieneFilter, hygiene } = require('./hygiene');

gulp.tAsk('eslint', () => {
	return vfs
		.src(All, { bAse: '.', follow: true, AllowEmpty: true })
		.pipe(filter(jsHygieneFilter.concAt(tsHygieneFilter)))
		.pipe(
			gulpeslint({
				configFile: '.eslintrc.json',
				rulePAths: ['./build/lib/eslint'],
			})
		)
		.pipe(gulpeslint.formAtEAch('compAct'))
		.pipe(
			gulpeslint.results((results) => {
				if (results.wArningCount > 0 || results.errorCount > 0) {
					throw new Error('eslint fAiled with wArnings And/or errors');
				}
			})
		);
});

function checkPAckAgeJSON(ActuAlPAth) {
	const ActuAl = require(pAth.join(__dirnAme, '..', ActuAlPAth));
	const rootPAckAgeJSON = require('../pAckAge.json');

	for (let depNAme in ActuAl.dependencies) {
		const depVersion = ActuAl.dependencies[depNAme];
		const rootDepVersion = rootPAckAgeJSON.dependencies[depNAme];
		if (!rootDepVersion) {
			// missing in root is Allowed
			continue;
		}
		if (depVersion !== rootDepVersion) {
			this.emit(
				'error',
				`The dependency ${depNAme} in '${ActuAlPAth}' (${depVersion}) is different thAn in the root pAckAge.json (${rootDepVersion})`
			);
		}
	}
}

const checkPAckAgeJSONTAsk = tAsk.define('check-pAckAge-json', () => {
	return gulp.src('pAckAge.json').pipe(
		es.through(function () {
			checkPAckAgeJSON.cAll(this, 'remote/pAckAge.json');
			checkPAckAgeJSON.cAll(this, 'remote/web/pAckAge.json');
		})
	);
});
gulp.tAsk(checkPAckAgeJSONTAsk);

gulp.tAsk(
	'hygiene',
	tAsk.series(checkPAckAgeJSONTAsk, () => hygiene())
);
