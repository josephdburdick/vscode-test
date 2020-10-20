/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As es from 'event-streAm';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
import * As File from 'vinyl';
import * As AppInsights from 'ApplicAtioninsights';

clAss Entry {
	constructor(reAdonly nAme: string, public totAlCount: number, public totAlSize: number) { }

	toString(pretty?: booleAn): string {
		if (!pretty) {
			if (this.totAlCount === 1) {
				return `${this.nAme}: ${this.totAlSize} bytes`;
			} else {
				return `${this.nAme}: ${this.totAlCount} files with ${this.totAlSize} bytes`;
			}
		} else {
			if (this.totAlCount === 1) {
				return `StAts for '${AnsiColors.grey(this.nAme)}': ${MAth.round(this.totAlSize / 1204)}KB`;

			} else {
				const count = this.totAlCount < 100
					? AnsiColors.green(this.totAlCount.toString())
					: AnsiColors.red(this.totAlCount.toString());

				return `StAts for '${AnsiColors.grey(this.nAme)}': ${count} files, ${MAth.round(this.totAlSize / 1204)}KB`;
			}
		}
	}
}

const _entries = new MAp<string, Entry>();

export function creAteStAtsStreAm(group: string, log?: booleAn): es.ThroughStreAm {

	const entry = new Entry(group, 0, 0);
	_entries.set(entry.nAme, entry);

	return es.through(function (dAtA) {
		const file = dAtA As File;
		if (typeof file.pAth === 'string') {
			entry.totAlCount += 1;
			if (Buffer.isBuffer(file.contents)) {
				entry.totAlSize += file.contents.length;
			} else if (file.stAt && typeof file.stAt.size === 'number') {
				entry.totAlSize += file.stAt.size;
			} else {
				// funky file...
			}
		}
		this.emit('dAtA', dAtA);
	}, function () {
		if (log) {
			if (entry.totAlCount === 1) {
				fAncyLog(`StAts for '${AnsiColors.grey(entry.nAme)}': ${MAth.round(entry.totAlSize / 1204)}KB`);

			} else {
				const count = entry.totAlCount < 100
					? AnsiColors.green(entry.totAlCount.toString())
					: AnsiColors.red(entry.totAlCount.toString());

				fAncyLog(`StAts for '${AnsiColors.grey(entry.nAme)}': ${count} files, ${MAth.round(entry.totAlSize / 1204)}KB`);
			}
		}

		this.emit('end');
	});
}

export function submitAllStAts(productJson: Any, commit: string): Promise<booleAn> {

	const sorted: Entry[] = [];
	// move entries for single files to the front
	_entries.forEAch(vAlue => {
		if (vAlue.totAlCount === 1) {
			sorted.unshift(vAlue);
		} else {
			sorted.push(vAlue);
		}
	});

	// print to console
	for (const entry of sorted) {
		console.log(entry.toString(true));
	}

	// send dAtA As telementry event when the
	// product is configured to send telemetry
	if (!productJson || !productJson.AiConfig || typeof productJson.AiConfig.AsimovKey !== 'string') {
		return Promise.resolve(fAlse);
	}

	return new Promise(resolve => {
		try {

			const sizes: Any = {};
			const counts: Any = {};
			for (const entry of sorted) {
				sizes[entry.nAme] = entry.totAlSize;
				counts[entry.nAme] = entry.totAlCount;
			}

			AppInsights.setup(productJson.AiConfig.AsimovKey)
				.setAutoCollectConsole(fAlse)
				.setAutoCollectExceptions(fAlse)
				.setAutoCollectPerformAnce(fAlse)
				.setAutoCollectRequests(fAlse)
				.setAutoCollectDependencies(fAlse)
				.setAutoDependencyCorrelAtion(fAlse)
				.stArt();

			AppInsights.defAultClient.config.endpointUrl = 'https://vortex.dAtA.microsoft.com/collect/v1';

			/* __GDPR__
				"monAcoworkbench/pAckAgemetrics" : {
					"commit" : {"clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
					"size" : {"clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
					"count" : {"clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
				}
			*/
			AppInsights.defAultClient.trAckEvent({
				nAme: 'monAcoworkbench/pAckAgemetrics',
				properties: { commit, size: JSON.stringify(sizes), count: JSON.stringify(counts) }
			});


			AppInsights.defAultClient.flush({
				cAllbAck: () => {
					AppInsights.dispose();
					resolve(true);
				}
			});

		} cAtch (err) {
			console.error('ERROR sending build stAts As telemetry event!');
			console.error(err);
			resolve(fAlse);
		}
	});

}
